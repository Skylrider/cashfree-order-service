const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Fix CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Your Cashfree Credentials from Environment Variables
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_URL = "https://api.cashfree.com/pg/orders";

// Function to generate Order ID → 6K-1001
function generateOrderId(shopifyOrderNumber) {
  return `6K-${shopifyOrderNumber}`;
}

// Shopify Webhook Endpoint - triggers when new order is created
app.post('/shopify-webhook', async (req, res) => {
  try {
    const shopifyOrder = req.body;

    // Get Shopify order number
    const shopifyOrderNumber = shopifyOrder.order_number;
    const amount = shopifyOrder.total_price;
    const customerPhone = shopifyOrder.billing_address?.phone || 
                         shopifyOrder.shipping_address?.phone || 
                         shopifyOrder.phone || '9999999999';
    const customerId = shopifyOrder.email || 
                      shopifyOrder.customer?.id?.toString() || 
                      `CUST_${shopifyOrderNumber}`;

    console.log(`New Shopify Order received: #${shopifyOrderNumber}`);

    // Generate custom Order ID
    const orderId = generateOrderId(shopifyOrderNumber);

    console.log(`Creating Cashfree order: ${orderId}`);

    // Call Cashfree API
    const response = await fetch(CASHFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId).substring(0, 45),
          customer_phone: customerPhone.replace(/\D/g, '').slice(-10)
        }
      })
    });

    const data = await response.json();

    if (data.order_id) {
      console.log(`✅ Cashfree order created successfully: ${orderId}`);
      res.status(200).json({ success: true, order_id: orderId });
    } else {
      console.log(`❌ Cashfree order creation failed:`, data);
      res.status(400).json({ success: false, error: data });
    }

  } catch (error) {
    console.log(`❌ Error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Old create-order endpoint (kept for backup)
app.post('/create-order', async (req, res) => {
  try {
    const { shopifyOrderNumber, amount, customerPhone, customerId } = req.body;
    const orderId = generateOrderId(shopifyOrderNumber);

    const response = await fetch(CASHFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: customerPhone
        }
      })
    });

    const data = await response.json();

    if (data.order_id) {
      res.json({ success: true, order_id: orderId, data });
    } else {
      res.status(400).json({ success: false, error: data });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
