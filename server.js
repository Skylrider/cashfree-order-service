const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

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

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_URL = "https://api.cashfree.com/pg/orders";

function generateOrderId(shopifyOrderNumber) {
  return `6K-${shopifyOrderNumber}`;
}

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

app.get('/', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
