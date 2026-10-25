const express = require('express');
const app = express(); // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
app.use(express.json());

const users = [
  { id: 1, name: 'Prakruti' },
  { id: 2, name: 'Demo User' }
];

// Health check: Kubernetes isi se pata karega ki service zinda hai
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Saare users
app.get('/users', (req, res) => res.json(users));

// Ek user
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`user-service running on port ${PORT}`));
