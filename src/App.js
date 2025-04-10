import React, { useEffect, useState } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";
import logoImage from "./logo.png";
import notifSound from "../src/components/notif.mp3";

function parseActionFromOrderTags(order) {
  const knownActions = [
    "Transferred",
    "Transferred - Elevator",
    "Picking",
    "Picked",
    "Requesting from Main Warehouse",
    "Out of Stock",
  ];
  if (!order.tags) return "";
  const tagList = order.tags.split(",").map((t) => t.trim());
  return knownActions.find((action) => tagList.includes(action)) || "";
}

function parsePickerFromOrderTags(order) {
  const knownPickers = ["Eugene", "Frances", "Lester", "Rommel"];
  if (!order.tags) return "";
  const tagList = order.tags.split(",").map((t) => t.trim());
  return knownPickers.find((p) => tagList.includes(p)) || "";
}

function App() {
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;
  const [orderActions, setOrderActions] = useState({});
  const [orderPickers, setOrderPickers] = useState({});
  const [confirmModal, setConfirmModal] = useState({ open: false, orderData: null });
  const [staffMap, setStaffMap] = useState({});
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [alertedOrderIds, setAlertedOrderIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleUserGesture = () => {
      const audio = new Audio(notifSound);
      audio.play().catch(() => {});
      window.notificationAudio = new Audio(notifSound);
      document.removeEventListener("click", handleUserGesture);
    };
    document.addEventListener("click", handleUserGesture);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, []);

  useEffect(() => {
    const pollForNewOrders = async () => {
      try {
        const response = await fetch("http://192.168.0.203:5000/api/orders");
        const data = await response.json();
  
        const filteredOrders = data.filter((order) => {
          const tags = order.tags ? order.tags.split(",").map(t => t.trim()) : [];
          const isPaid = order.financial_status === "paid";
          const isNotComplete = !tags.includes("Complete");
          const createdAt = new Date(order.created_at);
          const afterCutoff = createdAt >= new Date("2025-03-31T15:42:00+08:00");
  
          // POS and Online Store from Makerlab Manila only
          const isPOS = order.source_name === "pos" && order.location_id === 59489419455;
          const isOnlineMakerlabManila =
            (order.source_name === "web" || order.source_name === "online_store") &&
            order.fulfillment_status !== "fulfilled" &&
            order.location_id === 59489419455;
            

        
            const isDraftOrder = order.source_name === "shopify_draft_order";
          return (isPOS || isOnlineMakerlabManila || isDraftOrder) && isPaid && isNotComplete && afterCutoff;
        });
  
        const newOrderIds = filteredOrders
          .map((o) => o.id)
          .filter((id) => !alertedOrderIds.includes(id));
  
        if (newOrderIds.length > 0) {
          await fetchOrders(); // Load full UI only when needed
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
  
      setTimeout(pollForNewOrders, 10000); // Poll every 10 seconds
    };
  
    pollForNewOrders();
  }, []);
  
  

  const fetchStaff = async () => {
    try {
      const res = await fetch("http://192.168.0.203:5000/api/staff");
      const data = await res.json();
      const map = {};
      (data.users || []).forEach((user) => {
        map[user.id] = user.first_name;
      });
      setStaffMap(map);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://192.168.0.203:5000/api/orders");
      const data = await response.json();
  
      const filteredOrders = data.filter((order) => {
        const tags = order.tags ? order.tags.split(",").map(t => t.trim()) : [];
        const isPaid = order.financial_status === "paid";
        const isNotComplete = !tags.includes("Complete");
        const createdAt = new Date(order.created_at);
        const afterCutoff = createdAt >= new Date("2025-03-31T15:42:00+08:00");
  
        const isPOS = order.source_name === "pos" && order.location_id === 59489419455;
        const isOnline = (order.source_name === "web" || order.source_name === "online_store") && order.fulfillment_status !== "fulfilled";
  
        const isDraftOrder = order.source_name === "shopify_draft_order" && order.financial_status === "paid" && !order.tags?.includes("Complete");
        const isKiosk = order.source_name === "6304021" && order.financial_status === "paid" && !order.tags?.includes("Complete");
        
        const shouldInclude = (isPOS || isOnline || isDraftOrder || isKiosk) && isPaid && isNotComplete && afterCutoff;
  
        return shouldInclude;
      });
  
      setAllOrders(filteredOrders);
      setOrders(filteredOrders);
  
      const newOrderIds = filteredOrders
        .map((o) => o.id)
        .filter((id) => !alertedOrderIds.includes(id));
  
      if (newOrderIds.length > 0) {
        setNewOrdersCount(newOrderIds.length);
        if (window.notificationAudio) {
          window.notificationAudio.play().catch(() => {});
        }
  
        setNewOrderAlert(true);
        setTimeout(() => {
          setNewOrderAlert(false);
          setNewOrdersCount(0);
        }, 10000);
  
        setAlertedOrderIds((prev) => [...prev, ...newOrderIds]);
      }
  
      const initActions = {};
      const initPickers = {};
      filteredOrders.forEach((order) => {
        const gid = order.admin_graphql_api_id;
        initActions[gid] = parseActionFromOrderTags(order);
        initPickers[gid] = parsePickerFromOrderTags(order);
      });
  
      setOrderActions(initActions);
      setOrderPickers(initPickers);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };
  
  

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length === 0) {
      setSuggestions([]);
      setOrders(allOrders);
    } else {
      const filtered = allOrders.filter(order =>
        order.name.toLowerCase().includes(value.toLowerCase()) ||
        (order.processed_by && order.processed_by.toLowerCase().includes(value.toLowerCase()))
      );
      setSuggestions(filtered.slice(0, 5));
      setOrders(filtered);
    }
  };

  const handleSuggestionClick = (orderId) => {
    const match = allOrders.find(order => order.name === orderId);
    if (match) {
      setOrders([match]);
      setSuggestions([]);
      setSearchQuery(orderId);
    }
  };

  const goToHistory = () => navigate("/history");

  const handlePickerChange = async (globalId, newPicker) => {
    const oldPicker = orderPickers[globalId] || "";
    if (oldPicker && oldPicker !== newPicker) await removeTag(globalId, oldPicker);
    if (newPicker) await addTag(globalId, newPicker);
    setOrderPickers((prev) => ({ ...prev, [globalId]: newPicker }));
  };

  const handleActionChange = async (globalId, newAction) => {
    const oldAction = orderActions[globalId] || "";
    if (oldAction && oldAction !== newAction) await removeTag(globalId, oldAction);
    if (newAction) await addTag(globalId, newAction);
    setOrderActions((prev) => ({ ...prev, [globalId]: newAction }));
  };

  const handleCompleteClick = (order) => {
    setConfirmModal({ open: true, orderData: order });
  };

  const handleCancel = () => {
    setConfirmModal({ open: false, orderData: null });
  };

  const handleConfirm = async () => {
    const order = confirmModal.orderData;
    if (!order) return;
    const globalId = order.admin_graphql_api_id;
    await addTag(globalId, "Complete");

    const processedBy = order.processed_by
      ? order.processed_by
      : (order.attributedStaffs?.[0]?.name || "No staff");
    const picker = orderPickers[globalId] || "";
    const action = orderActions[globalId] || "";
    const link = `https://admin.shopify.com/store/makerlab-electronics-ph/orders/${order.id}`;

    const recordData = {
      order_id: order.name,
      order_date: order.created_at,
      processed_by: processedBy,
      picker: picker,
      action: action,
      link: link,
    };

    try {
      await fetch("http://localhost/record_fulfillment.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordData),
      });
    } catch (err) {
      console.error("Error calling PHP endpoint:", err);
    }

    setOrders((prev) => prev.filter((o) => o.admin_graphql_api_id !== globalId));
    setConfirmModal({ open: false, orderData: null });
  };

  const removeTag = async (globalId, oldTag) => {
    if (!oldTag) return;
    try {
      await fetch(`http://192.168.0.203:5000/api/orders/${encodeURIComponent(globalId)}/tag/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: oldTag }),
      });
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  const addTag = async (globalId, newTag) => {
    try {
      await fetch(`http://192.168.0.203:5000/api/orders/${encodeURIComponent(globalId)}/tag/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTag }),
      });
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const Notification = () => (
    <div className="order-notification">
      <span>🛒 {newOrdersCount} new order{newOrdersCount > 1 ? "s" : ""}</span>
      <button onClick={fetchOrders}>Refresh</button>
      <span className="close-notif" onClick={() => {
        setNewOrderAlert(false);
        setNewOrdersCount(0);
      }}>×</span>
    </div>
  );

  return (
    <div className="app-container">
      {newOrderAlert && <Notification />}
      <div className="main-wrapper">
        <header className="header">
          <div className="logo-container">
            <img src={logoImage} alt="Logo" className="logo" />
            <h2 style={{ color: "#fff", marginLeft: "10px" }}>Order Management</h2>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-box"
              placeholder="Search Order ID or Processed By"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s) => (
                  <li key={s.id} onClick={() => handleSuggestionClick(s.name)}>
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="history-button" onClick={goToHistory}>History</button>
        </header>

        <div className="table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Date</th>
                <th>Channel</th>
                <th>Processed by</th>
                <th>Picker</th>
                <th>Action</th>
                <th>Link</th>
                <th>Status</th>
                <th>Complete</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders
                  .slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage)
                  .map((order) => {
                    const globalId = order.admin_graphql_api_id;
                    const isComplete = order.tags?.split(',').map(t => t.trim()).includes("Complete");
                    return (
                      <tr key={order.id}>
                        <td>{order.name}</td>
                        <td>{new Date(order.created_at).toLocaleString()}</td>
                        <td>{order.source_name === "pos" ? "POS" : "Online Store"}</td>
                        <td>{order.user_id && staffMap[order.user_id] ? staffMap[order.user_id] : order.processed_by || " "}</td>
                        <td>{isComplete ? (orderPickers[globalId] || "—") : (
                          <select
                            className="action-select"
                            value={orderPickers[globalId] || ""}
                            onChange={(e) => handlePickerChange(globalId, e.target.value)}
                          >
                            <option value="">Select Picker</option>
                            <option value="Eugene">Eugene</option>
                            <option value="Frances">Frances</option>
                            <option value="Lester">Lester</option>
                            <option value="Rommel">Rommel</option>
                          </select>
                        )}</td>
                        <td>{isComplete ? (orderActions[globalId] || "—") : (
                          <select
                            className="action-select"
                            value={orderActions[globalId] || ""}
                            onChange={(e) => handleActionChange(globalId, e.target.value)}
                          >
                            <option value="">Select Action</option>
                            {["Transferred", "Transferred - Elevator", "Picking", "Picked", "Requesting from Main Warehouse", "Out of Stock"].map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        )}</td>
                        <td><a href={`https://admin.shopify.com/store/makerlab-electronics-ph/orders/${order.id}`} target="_blank" rel="noopener noreferrer">Link</a></td>
                        <td>{isComplete ? "Completed" : "Pending"}</td>
                        <td>{isComplete ? "—" : <button className="complete-button" onClick={() => handleCompleteClick(order)}>Complete</button>}</td>
                      </tr>
                    );
                  })
              ) : (
                <tr><td colSpan="9" className="no-orders">No orders available</td></tr>
              )}
            </tbody>
          </table>

          <div className="pagination-buttons">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
            <span>Page {currentPage} of {Math.ceil(orders.length / ordersPerPage)}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(orders.length / ordersPerPage)))} disabled={currentPage === Math.ceil(orders.length / ordersPerPage)}>&gt;</button>
          </div>
        </div>
      </div>

      {confirmModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete</h3>
              <span className="close-icon" onClick={handleCancel}>×</span>
            </div>
            <div className="modal-body"><p>Are you sure you want to complete this order?</p></div>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleCancel}>Cancel</button>
              <button className="complete-button" onClick={handleConfirm}>Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
