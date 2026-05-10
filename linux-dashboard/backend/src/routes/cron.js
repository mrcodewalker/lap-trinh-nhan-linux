/**
 * Cron Job Management Routes
 */
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/cron/list - List cron jobs
router.get('/list', authenticateToken, (req, res) => {
  try {
    const crontab = spawn('crontab', ['-l']);
    let output = '';
    let error = '';

    crontab.stdout.on('data', (data) => {
      output += data.toString();
    });

    crontab.stderr.on('data', (data) => {
      error += data.toString();
    });

    crontab.on('close', () => {
      const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const jobs = lines.map((line, idx) => {
        const parts = line.split(/\s+/);
        return {
          id: idx,
          minute: parts[0],
          hour: parts[1],
          dayOfMonth: parts[2],
          month: parts[3],
          dayOfWeek: parts[4],
          command: parts.slice(5).join(' '),
          raw: line
        };
      });

      res.json({ jobs, count: jobs.length });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/add - Add cron job
router.post('/add', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { minute, hour, dayOfMonth, month, dayOfWeek, command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    const cronLine = `${minute || '*'} ${hour || '*'} ${dayOfMonth || '*'} ${month || '*'} ${dayOfWeek || '*'} ${command}`;

    // Get current crontab
    const crontab = spawn('crontab', ['-l']);
    let currentCron = '';

    crontab.stdout.on('data', (data) => {
      currentCron += data.toString();
    });

    crontab.on('close', () => {
      const newCron = currentCron + '\n' + cronLine + '\n';

      // Write new crontab
      const echo = spawn('bash', ['-c', `echo "${newCron}" | crontab -`]);

      echo.on('close', (code) => {
        if (code === 0) {
          logger.info(`Cron job added by ${req.user.username}: ${cronLine}`);
          res.json({ message: 'Cron job added successfully', job: cronLine });
        } else {
          res.status(500).json({ error: 'Failed to add cron job' });
        }
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cron/remove - Remove cron job
router.delete('/remove', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.body;

    if (id === undefined) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    const crontab = spawn('crontab', ['-l']);
    let currentCron = '';

    crontab.stdout.on('data', (data) => {
      currentCron += data.toString();
    });

    crontab.on('close', () => {
      const lines = currentCron.split('\n');
      const newLines = lines.filter((line, idx) => {
        return idx !== parseInt(id) && line.trim();
      });

      const newCron = newLines.join('\n') + '\n';

      const echo = spawn('bash', ['-c', `echo "${newCron}" | crontab -`]);

      echo.on('close', (code) => {
        if (code === 0) {
          logger.info(`Cron job removed by ${req.user.username}: ID ${id}`);
          res.json({ message: 'Cron job removed successfully' });
        } else {
          res.status(500).json({ error: 'Failed to remove cron job' });
        }
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cron/history - Get cron execution history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const grep = spawn('grep', ['CRON', '/var/log/syslog']);
    let output = '';

    grep.stdout.on('data', (data) => {
      output += data.toString();
    });

    grep.on('close', () => {
      const lines = output.split('\n').filter(l => l.trim()).slice(-50);
      res.json({ history: lines, count: lines.length });
    });

    grep.on('error', () => {
      res.json({ history: [], count: 0 });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
