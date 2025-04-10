import React, { useState, useEffect } from "react";

const ShopifyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/orders");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        console.log("Shopify Orders Response:", data);

        if (!data.orders || data.orders.length === 0) {
          throw new Error("No orders found.");
        }

        setOrders(data.orders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError(error.message);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Shopify Orders</h2>
      
      {error && <p className="text-red-500">Error: {error}</p>}

      {orders.length > 0 ? (
        <ul className="list-disc pl-6">
          {orders.map((order) => (
            <li key={order.id} className="text-lg">
              <strong>{order.name}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>No orders found</p>
      )}
    </div>
  );
};

export default ShopifyOrders;
