const express = require('express');
const app = express();

// Kubernetes mein service ka naam use hoga, abhi local default
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// user-service se users mangwata hai
app.get('/api/users', async (req, res) => {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/users`);
    const data = await response.json();
    res.json({ source: 'web-api', users: data });
  } catch (err) {
    res.status(503).json({ error: 'user-service unavailable' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`web-api running on port ${PORT}`));
