/**
 * Network Monitoring Routes
 */
const express = require('express');
const { spawn } = require('child_process');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/network/interfaces - Get network interfaces
router.get('/interfaces', authenticateToken, (req, res) => {
  try {
    const ip = spawn('ip', ['link', 'show']);
    let output = '';

    ip.stdout.on('data', (data) => {
      output += data.toString();
    });

    ip.on('close', () => {
      res.json({ interfaces: output });
    });

    ip.on('error', (err) => {
      logger.error(`Failed to start ip: ${err.message}`);
      res.status(500).json({ error: 'ip command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/stats - Get network statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const ss = spawn('ss', ['-s']);
    let output = '';

    ss.stdout.on('data', (data) => {
      output += data.toString();
    });

    ss.on('close', () => {
      res.json({ stats: output });
    });

    ss.on('error', (err) => {
      logger.error(`Failed to start ss: ${err.message}`);
      res.status(500).json({ error: 'ss command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/connections - Get active connections
router.get('/connections', authenticateToken, (req, res) => {
  try {
    const ss = spawn('ss', ['-tuln']);
    let output = '';

    ss.stdout.on('data', (data) => {
      output += data.toString();
    });

    ss.on('close', () => {
      const lines = output.split('\n').slice(1);
      const connections = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            proto: parts[0],
            recvQ: parts[1],
            sendQ: parts[2],
            localAddr: parts[3],
            peerAddr: parts[4],
            state: parts[5]
          };
        });

      res.json({ connections, count: connections.length });
    });

    ss.on('error', (err) => {
      logger.error(`Failed to start ss: ${err.message}`);
      res.status(500).json({ error: 'ss command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/ports - Get listening ports
router.get('/ports', authenticateToken, (req, res) => {
  try {
    const ss = spawn('ss', ['-tlnp']);
    let output = '';

    ss.stdout.on('data', (data) => {
      output += data.toString();
    });

    ss.on('close', () => {
      res.json({ ports: output });
    });

    ss.on('error', (err) => {
      logger.error(`Failed to start ss: ${err.message}`);
      res.status(500).json({ error: 'ss command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/network/ping - Ping host
router.post('/ping', authenticateToken, (req, res) => {
  try {
    const { host, count = 4 } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host required' });
    }

    const ping = spawn('ping', ['-c', count.toString(), host]);
    let output = '';

    ping.stdout.on('data', (data) => {
      output += data.toString();
    });

    ping.stderr.on('data', (data) => {
      output += data.toString();
    });

    ping.on('close', (code) => {
      res.json({ result: output, success: code === 0 });
    });

    ping.on('error', (err) => {
      logger.error(`Failed to start ping: ${err.message}`);
      res.status(500).json({ error: 'ping command not found' });
    });

    setTimeout(() => {
      ping.kill();
    }, 10000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/network/traceroute - Traceroute
router.post('/traceroute', authenticateToken, (req, res) => {
  try {
    const { host } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host required' });
    }

    const tr = spawn('traceroute', ['-m', '30', host]);
    let output = '';

    tr.stdout.on('data', (data) => {
      output += data.toString();
    });

    tr.on('close', () => {
      res.json({ result: output });
    });

    setTimeout(() => {
      tr.kill();
    }, 15000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/network/dns - DNS lookup
router.post('/dns', authenticateToken, (req, res) => {
  try {
    const { host } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host required' });
    }

    const dig = spawn('dig', [host]);
    let output = '';

    dig.stdout.on('data', (data) => {
      output += data.toString();
    });

    dig.on('close', () => {
      res.json({ result: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/ifconfig - Get ifconfig output
router.get('/ifconfig', authenticateToken, (req, res) => {
  try {
    const ifconfig = spawn('ifconfig');
    let output = '';

    ifconfig.stdout.on('data', (data) => {
      output += data.toString();
    });

    ifconfig.on('close', () => {
      res.json({ data: output });
    });

    ifconfig.on('error', (err) => {
      // If ifconfig is missing (ENOENT), try 'ip addr' as fallback
      if (err.code === 'ENOENT') {
        const ip = spawn('ip', ['addr']);
        let ipOutput = '';
        ip.stdout.on('data', (d) => { ipOutput += d.toString(); });
        ip.on('close', () => {
          res.json({ data: ipOutput, notice: 'ifconfig not found, showing "ip addr" output instead' });
        });
        ip.on('error', () => {
          res.status(500).json({ error: 'Neither ifconfig nor ip command found' });
        });
      } else {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
