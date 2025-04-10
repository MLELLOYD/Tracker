const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SHOPIFY_STORE_URL = ""; // Make sure this is correct
const ACCESS_TOKEN = " ";


// --------------------------------------------------------
// 1. REST endpoint to fetch all orders (unchanged)
app.get("/api/orders", async (req, res) => {
  try {
    const response = await axios.get(
      `${SHOPIFY_STORE_URL}/admin/api/2025-01/orders.json?status=any&limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    if (!Array.isArray(response.data.orders)) {
      return res.status(500).json({ error: "Invalid response from Shopify API" });
    }
    res.json(response.data.orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/staff", (req, res) => {
  res.json({
    users: [
      { id: 89570115775, first_name: "Harley"},
      { id: 86243705023, first_name: "Jona"},
      { id: 86996385983, first_name: "Aileen" },
      { id: 87009525951, first_name: "Eloisa"},
      { id: 91369308351, first_name: "Elija"},
      { id: 87009558719, first_name: "Vince"},
      { id: 90900267199, first_name: "Chynah"},
      { id: 82700664909, first_name: "Lloyd"},
      { id: 86135472319, first_name: "Admin"},
    ]
  });
});


// --------------------------------------------------------
// 2. POST endpoint to ADD a tag to an order
app.post("/api/orders/:id/tag/add", async (req, res) => {
  // :id must be the global ID, e.g. "gid://shopify/Order/123456789"
  const orderId = req.params.id;
  const { tag } = req.body;

  const mutation = `
    mutation AddTagToOrder($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
          ... on Order {
            tags
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      `${SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json`,
      { query: mutation, variables: { id: orderId, tags: [tag] } },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response;
    if (
      data.errors ||
      (data.data &&
        data.data.tagsAdd &&
        data.data.tagsAdd.userErrors &&
        data.data.tagsAdd.userErrors.length > 0)
    ) {
      return res.status(500).json({
        error: data.errors || data.data.tagsAdd.userErrors,
      });
    }

    res.json(data.data.tagsAdd);
  } catch (error) {
    console.error("Error adding tag to order:", error);
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// 3. POST endpoint to REMOVE a tag from an order
app.post("/api/orders/:id/tag/remove", async (req, res) => {
  const orderId = req.params.id;
  const { tag } = req.body;

  const mutation = `
    mutation RemoveTagFromOrder($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node {
          id
          ... on Order {
            tags
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      `${SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json`,
      { query: mutation, variables: { id: orderId, tags: [tag] } },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response;
    if (
      data.errors ||
      (data.data &&
        data.data.tagsRemove &&
        data.data.tagsRemove.userErrors &&
        data.data.tagsRemove.userErrors.length > 0)
    ) {
      return res.status(500).json({
        error: data.errors || data.data.tagsRemove.userErrors,
      });
    }

    res.json(data.data.tagsRemove);
  } catch (error) {
    console.error("Error removing tag from order:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Proxy server running on port 5000"));

app.get("/api/draft_orders", async (req, res) => {
  try {
    const response = await axios.get(
      `${SHOPIFY_STORE_URL}/admin/api/2025-01/draft_orders.json?status=complete`, // 'complete' shows only paid draft orders
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const paidDraftOrders = (response.data.draft_orders || []).filter(
      (order) => order.payment_status === "paid"
    );

    // Map into a shape similar to orders
    const transformedOrders = paidDraftOrders.map((draft) => ({
      id: draft.id,
      name: draft.name,
      created_at: draft.created_at,
      source_name: "draft_order",
      location_id: draft.location_id || 59489419455,
      user_id: draft.user_id || null,
      processed_by: draft.processed_by || "",
      tags: draft.tags || "",
      financial_status: draft.payment_status,
      fulfillment_status: draft.status === "completed" ? "fulfilled" : "unfulfilled",
      admin_graphql_api_id: draft.admin_graphql_api_id || `gid://shopify/DraftOrder/${draft.id}`,
    }));

    res.json(transformedOrders);
  } catch (error) {
    console.error("Error fetching draft orders:", error);
    res.status(500).json({ error: error.message });
  }
});