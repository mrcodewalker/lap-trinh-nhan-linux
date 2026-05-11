/**
 * Process & Network Module
 * Process Management, Network Monitoring, Socket Tracking
 */
const express = require('express');
const { spawn } = require('child_process');
const os = require('os');
const logger = require('../utils/logger');

const router = express.Router();

// ============ PROCESS MANAGEMENT ============

// GET /api/process/list - Get all processes
router.get('/list', async (req, res) => {
  try {
    const ps = spawn('ps', ['aux']);
    let output = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.on('close', () => {
      const lines = output.split('\n').slice(1);
      const processes = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            user: parts[0],
            pid: parts[1],
            cpu: parts[2],
            mem: parts[3],
            vsz: parts[4],
            rss: parts[5],
            tty: parts[6],
            stat: parts[7],
            start: parts[8],
            time: parts[9],
            command: parts.slice(10).join(' ')
          };
        });

      res.json({ processes, count: processes.length });
    });

    ps.on('error', (err) => {
      logger.error(`Failed to start ps: ${err.message}`);
      res.status(500).json({ error: 'ps command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/tree - Get process tree
router.get('/tree', async (req, res) => {
  try {
    const ps = spawn('pstree', ['-p']);
    let output = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.on('close', () => {
      res.json({ tree: output });
    });

    ps.on('error', () => {
      res.json({ tree: 'pstree not available' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/info/:pid - Get process info
router.get('/info/:pid', (req, res) => {
  try {
    const { pid } = req.params;
    const ps = spawn('cat', [`/proc/${pid}/status`]);
    let output = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
    });

    ps.on('close', () => {
      res.json({ info: output, pid });
    });

    ps.on('error', (err) => {
      res.status(404).json({ error: `Process ${pid} not found` });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/process/kill - Kill process
router.post('/kill', (req, res) => {
  try {
    const { pid, signal = 'SIGTERM' } = req.body;

    if (!pid) {
      return res.status(400).json({ error: 'PID required' });
    }

    logger.info(`Killing process ${pid} with signal ${signal}`);
    process.kill(parseInt(pid), signal);

    res.json({ message: `Process ${pid} killed with signal ${signal}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/process/start - Start a new process
router.post('/start', (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    logger.info(`Starting process: ${command}`);

    const parts = command.split(' ');
    const proc = spawn(parts[0], parts.slice(1), { detached: true, stdio: 'ignore' });
    proc.unref();

    res.json({ message: `Process started: ${command}`, pid: proc.pid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/top - Top-like realtime data
router.get('/top', (req, res) => {
  try {
    const top = spawn('top', ['-b', '-n', '1']);
    let output = '';

    top.stdout.on('data', (data) => {
      output += data.toString();
    });

    top.on('close', () => {
      res.json({ data: output });
    });

    top.on('error', (err) => {
      logger.error(`Failed to start top: ${err.message}`);
      res.status(500).json({ error: 'top command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SYSTEM RESOURCES ============

// GET /api/process/resources - Get system resources
router.get('/resources', (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    res.json({
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: ((usedMemory / totalMemory) * 100).toFixed(2)
      },
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/disk - Get disk usage
router.get('/disk', (req, res) => {
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

    df.on('error', (err) => {
      logger.error(`Failed to start df: ${err.message}`);
      res.status(500).json({ error: 'df command not found or failed' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NETWORK MONITORING ============

// GET /api/process/network/interfaces - Get network interfaces
router.get('/network/interfaces', (req, res) => {
  try {
    const ip = spawn('ip', ['link', 'show']);
    let output = '';

    ip.stdout.on('data', (data) => {
      output += data.toString();
    });

    ip.on('close', () => {
      res.json({ interfaces: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/network/connections - Get active connections
router.get('/network/connections', (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/network/ports - Get listening ports
router.get('/network/ports', (req, res) => {
  try {
    const ss = spawn('ss', ['-tlnp']);
    let output = '';

    ss.stdout.on('data', (data) => {
      output += data.toString();
    });

    ss.on('close', () => {
      res.json({ ports: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/process/network/stats - Get network statistics
router.get('/network/stats', (req, res) => {
  try {
    const ss = spawn('ss', ['-s']);
    let output = '';

    ss.stdout.on('data', (data) => {
      output += data.toString();
    });

    ss.on('close', () => {
      res.json({ stats: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/process/network/ping - Ping host
router.post('/network/ping', (req, res) => {
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

    setTimeout(() => {
      ping.kill();
    }, 10000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/process/network/traceroute - Traceroute
router.post('/network/traceroute', (req, res) => {
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

// POST /api/process/network/dns - DNS lookup
router.post('/network/dns', (req, res) => {
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

// GET /api/process/network/ifconfig - Get ifconfig output
router.get('/network/ifconfig', (req, res) => {
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

// ============ SYSTEM LOGS ============

// GET /api/process/logs/journalctl - Get journalctl logs
router.get('/logs/journalctl', (req, res) => {
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

// GET /api/process/logs/auth - Get auth logs
router.get('/logs/auth', (req, res) => {
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

// GET /api/process/logs/kernel - Get kernel logs
router.get('/logs/kernel', (req, res) => {
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

module.exports = router;
