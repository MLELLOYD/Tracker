import React, { useEffect, useState } from "react";
import "./App2.css";
import logoImage from "./logo.png";

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
  const knownPickers = ["Eugene", "Frances", "Lester"];
  if (!order.tags) return "";
  const tagList = order.tags.split(",").map((t) => t.trim());
  return knownPickers.find((p) => tagList.includes(p)) || "";
}

function History() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [staffMap, setStaffMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const ordersPerPage = 20;

  useEffect(() => {
    fetchCompletedOrders();
    fetchStaff();
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      const response = await fetch("http://192.168.0.203:5000/api/orders");
      const data = await response.json();

      const completedOrders = data.filter((order) => {
        return (
          order.tags &&
          order.tags.split(",").map((t) => t.trim()).includes("Complete")
        );
      });

      setOrders(completedOrders);
      setFilteredOrders(completedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

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

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);

    if (value === "") {
      setSuggestions([]);
      setFilteredOrders(orders);
    } else {
      const matches = orders.filter((order) => {
        const processedName =
          order.user_id && staffMap[order.user_id]
            ? staffMap[order.user_id].toLowerCase()
            : order.processed_by?.toLowerCase() || "";
      
        return (
          order.name.toLowerCase().includes(value) ||
          processedName.includes(value)
        );
      });
      setSuggestions(matches.slice(0, 5));
      setFilteredOrders(matches);
      setCurrentPage(1);
    }
  };

  const handleSuggestionClick = (orderId) => {
    const selectedOrder = orders.find((order) => order.name === orderId);
    if (selectedOrder) {
      setFilteredOrders([selectedOrder]);
      setSearchQuery(orderId);
      setSuggestions([]);
      setCurrentPage(1);
    }
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  return (
    <div className="app-container">
      <div className="main-wrapper">
        <header className="header">
          <div className="logo-container">
            <img src={logoImage} alt="Logo" className="logo" />
            <h2 style={{ color: "#fff", marginLeft: "10px" }}>Order History</h2>
          </div>

          <div className="search-container" style={{ position: "relative" }}>
            <input
              type="text"
              className="search-box"
              placeholder="Search Order ID or Processed By"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "38px",
                  left: 0,
                  background: "white",
                  listStyle: "none",
                  padding: "8px",
                  margin: 0,
                  boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                  zIndex: 10,
                  width: "100%",
                  borderRadius: "4px",
                }}
              >
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleSuggestionClick(s.name)}
                    style={{
                      padding: "6px 8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <div className="table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Date</th>
                <th>Processed by</th>
                <th>Picker</th>
                <th>Action</th>
                <th>Link</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.name}</td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      {order.user_id && staffMap[order.user_id]
                        ? staffMap[order.user_id]
                        : order.processed_by || " "}
                    </td>
                    <td>{parsePickerFromOrderTags(order) || "—"}</td>
                    <td>{parseActionFromOrderTags(order) || "—"}</td>
                    <td>
                      <a
                        href={`https://admin.shopify.com/store/wyz99t-s2/orders/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Link
                      </a>
                    </td>
                    <td>Completed</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-orders">
                    No history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredOrders.length > ordersPerPage && (
            <div className="pagination-buttons">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;
