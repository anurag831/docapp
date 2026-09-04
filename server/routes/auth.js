const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// GET /api/auth/users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
});

module.exports = router;
