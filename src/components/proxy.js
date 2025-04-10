const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

const SHOPIFY_STORE_URL = "https://3dgtr0-1c.myshopify.com";
const ACCESS_TOKEN = "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";

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
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Proxy server running on port 5000"));
