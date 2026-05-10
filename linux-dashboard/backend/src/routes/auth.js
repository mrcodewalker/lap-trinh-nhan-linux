/**
 * Authentication Routes
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// In-memory users (replace with DB in production)
const users = [
  {
    id: '1',
    username: 'admin',
    // password: admin123
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'admin',
    name: 'System Administrator'
  },
  {
    id: '2',
    username: 'user',
    // password: user123
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'user',
    name: 'Linux User'
  }
];

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      logger.warn(`Failed login attempt for username: ${username} from ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn(`Failed login attempt for username: ${username} from ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    logger.info(`User ${username} logged in from ${req.ip}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  logger.info(`User ${req.user.username} logged out`);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
