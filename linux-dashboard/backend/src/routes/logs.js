/**
 * System Logs Routes
 */
const express = require('express');
const { spawn } = require('child_process');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/logs/journalctl - Get journalctl logs
router.get('/journalctl', authenticateToken, (req, res) => {
  try {
    const { lines = 100, unit } = req.query;
    const args = ['-n', lines.toString(), '--no-pager'];

    if (unit) {
      args.push('-u', unit);
    }

    const journalctl = spawn('journalctl', args);
    let output = '';

    journalctl.stdout.on('data', (data) => {
      output += data.toString();
    });

    journalctl.on('close', () => {
      res.json({ logs: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/auth - Get auth logs
router.get('/auth', authenticateToken, (req, res) => {
  try {
    const tail = spawn('tail', ['-n', '100', '/var/log/auth.log']);
    let output = '';

    tail.stdout.on('data', (data) => {
      output += data.toString();
    });

    tail.on('close', () => {
      res.json({ logs: output });
    });

    tail.on('error', () => {
      res.json({ logs: 'Auth log not available' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/kernel - Get kernel logs
router.get('/kernel', authenticateToken, (req, res) => {
  try {
    const dmesg = spawn('dmesg');
    let output = '';

    dmesg.stdout.on('data', (data) => {
      output += data.toString();
    });

    dmesg.on('close', () => {
      const lines = output.split('\n').slice(-100);
      res.json({ logs: lines.join('\n') });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/syslog - Get syslog
router.get('/syslog', authenticateToken, (req, res) => {
  try {
    const tail = spawn('tail', ['-n', '100', '/var/log/syslog']);
    let output = '';

    tail.stdout.on('data', (data) => {
      output += data.toString();
    });

    tail.on('close', () => {
      res.json({ logs: output });
    });

    tail.on('error', () => {
      res.json({ logs: 'Syslog not available' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/search - Search logs
router.get('/search', authenticateToken, (req, res) => {
  try {
    const { query, file = 'syslog' } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const grep = spawn('grep', ['-i', query, `/var/log/${file}`]);
    let output = '';

    grep.stdout.on('data', (data) => {
      output += data.toString();
    });

    grep.on('close', () => {
      const lines = output.split('\n').filter(l => l.trim());
      res.json({ results: lines, count: lines.length });
    });

    setTimeout(() => {
      grep.kill();
    }, 5000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/failed-logins - Get failed login attempts
router.get('/failed-logins', authenticateToken, (req, res) => {
  try {
    const grep = spawn('grep', ['Failed password', '/var/log/auth.log']);
    let output = '';

    grep.stdout.on('data', (data) => {
      output += data.toString();
    });

    grep.on('close', () => {
      const lines = output.split('\n').filter(l => l.trim()).slice(-50);
      res.json({ attempts: lines, count: lines.length });
    });

    grep.on('error', () => {
      res.json({ attempts: [], count: 0 });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
