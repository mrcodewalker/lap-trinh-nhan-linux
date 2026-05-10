/**
 * System Information Routes
 */
const express = require('express');
const { spawn } = require('child_process');
const os = require('os');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/system/info - Get system information
router.get('/info', authenticateToken, (req, res) => {
  try {
    const info = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      networkInterfaces: Object.keys(os.networkInterfaces()).length
    };

    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/cpu - Get CPU info
router.get('/cpu', authenticateToken, (req, res) => {
  try {
    const cpus = os.cpus();
    const cpuInfo = {
      count: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0,
      cores: cpus.length,
      details: cpus.map(cpu => ({
        model: cpu.model,
        speed: cpu.speed,
        times: cpu.times
      }))
    };

    res.json(cpuInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/memory - Get memory info
router.get('/memory', authenticateToken, (req, res) => {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    res.json({
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentage: ((usedMemory / totalMemory) * 100).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/disk - Get disk usage
router.get('/disk', authenticateToken, (req, res) => {
  try {
    const df = spawn('df', ['-h']);
    let output = '';

    df.stdout.on('data', (data) => {
      output += data.toString();
    });

    df.on('close', () => {
      const lines = output.split('\n').slice(1);
      const disks = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            percentage: parts[4],
            mounted: parts[5]
          };
        });

      res.json({ disks });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/uptime - Get system uptime
router.get('/uptime', authenticateToken, (req, res) => {
  try {
    const uptime = spawn('uptime');
    let output = '';

    uptime.stdout.on('data', (data) => {
      output += data.toString();
    });

    uptime.on('close', () => {
      res.json({ uptime: output.trim() });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/uname - Get uname info
router.get('/uname', authenticateToken, (req, res) => {
  try {
    const uname = spawn('uname', ['-a']);
    let output = '';

    uname.stdout.on('data', (data) => {
      output += data.toString();
    });

    uname.on('close', () => {
      res.json({ uname: output.trim() });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/timezone - Get timezone
router.get('/timezone', authenticateToken, (req, res) => {
  try {
    const timedatectl = spawn('timedatectl');
    let output = '';

    timedatectl.stdout.on('data', (data) => {
      output += data.toString();
    });

    timedatectl.on('close', () => {
      res.json({ timezone: output });
    });

    timedatectl.on('error', () => {
      res.json({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/date - Get current date/time
router.get('/date', authenticateToken, (req, res) => {
  try {
    res.json({
      date: new Date().toISOString(),
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
