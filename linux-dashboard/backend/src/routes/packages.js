/**
 * Package Management Routes (apt)
 */
const express = require('express');
const { spawn } = require('child_process');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/packages/list - List installed packages
router.get('/list', authenticateToken, (req, res) => {
  try {
    const dpkg = spawn('dpkg', ['-l']);
    let output = '';

    dpkg.stdout.on('data', (data) => {
      output += data.toString();
    });

    dpkg.on('close', () => {
      const lines = output.split('\n').slice(5);
      const packages = lines
        .filter(line => line.trim() && line.startsWith('ii'))
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            status: parts[0],
            name: parts[1],
            version: parts[2],
            arch: parts[3],
            description: parts.slice(4).join(' ')
          };
        });

      res.json({ packages, count: packages.length });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/packages/search - Search packages
router.get('/search', authenticateToken, (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const apt = spawn('apt', ['search', query]);
    let output = '';

    apt.stdout.on('data', (data) => {
      output += data.toString();
    });

    apt.stderr.on('data', (data) => {
      output += data.toString();
    });

    apt.on('close', () => {
      res.json({ results: output });
    });

    setTimeout(() => {
      apt.kill();
    }, 10000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packages/install - Install package
router.post('/install', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg) {
      return res.status(400).json({ error: 'Package name required' });
    }

    logger.info(`Installing package: ${pkg} by ${req.user.username}`);

    const apt = spawn('apt', ['install', '-y', pkg]);
    let output = '';
    let error = '';

    apt.stdout.on('data', (data) => {
      output += data.toString();
    });

    apt.stderr.on('data', (data) => {
      error += data.toString();
    });

    apt.on('close', (code) => {
      res.json({
        message: code === 0 ? 'Package installed successfully' : 'Installation failed',
        output,
        error,
        success: code === 0
      });
    });

    setTimeout(() => {
      apt.kill();
    }, 60000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packages/remove - Remove package
router.post('/remove', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg) {
      return res.status(400).json({ error: 'Package name required' });
    }

    logger.info(`Removing package: ${pkg} by ${req.user.username}`);

    const apt = spawn('apt', ['remove', '-y', pkg]);
    let output = '';
    let error = '';

    apt.stdout.on('data', (data) => {
      output += data.toString();
    });

    apt.stderr.on('data', (data) => {
      error += data.toString();
    });

    apt.on('close', (code) => {
      res.json({
        message: code === 0 ? 'Package removed successfully' : 'Removal failed',
        output,
        error,
        success: code === 0
      });
    });

    setTimeout(() => {
      apt.kill();
    }, 60000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packages/update - Update package list
router.post('/update', authenticateToken, requireAdmin, (req, res) => {
  try {
    logger.info(`Updating package list by ${req.user.username}`);

    const apt = spawn('apt', ['update']);
    let output = '';
    let error = '';

    apt.stdout.on('data', (data) => {
      output += data.toString();
    });

    apt.stderr.on('data', (data) => {
      error += data.toString();
    });

    apt.on('close', (code) => {
      res.json({
        message: code === 0 ? 'Package list updated' : 'Update failed',
        output,
        error,
        success: code === 0
      });
    });

    setTimeout(() => {
      apt.kill();
    }, 60000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/packages/upgrade - Upgrade packages
router.post('/upgrade', authenticateToken, requireAdmin, (req, res) => {
  try {
    logger.info(`Upgrading packages by ${req.user.username}`);

    const apt = spawn('apt', ['upgrade', '-y']);
    let output = '';
    let error = '';

    apt.stdout.on('data', (data) => {
      output += data.toString();
    });

    apt.stderr.on('data', (data) => {
      error += data.toString();
    });

    apt.on('close', (code) => {
      res.json({
        message: code === 0 ? 'Packages upgraded' : 'Upgrade failed',
        output,
        error,
        success: code === 0
      });
    });

    setTimeout(() => {
      apt.kill();
    }, 120000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
