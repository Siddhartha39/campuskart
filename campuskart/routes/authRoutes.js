const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Signup Route (already present)
router.post('/signup', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json({ message: 'User registered successfully!' });
});

// ✅ Add this: Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({
    message: 'Login successful',
    user: {
      name: user.name,
      role: user.role,
      college: user.college,
      email: user.email,
      phone: user.phone,
    }
  });
});

module.exports = router;
