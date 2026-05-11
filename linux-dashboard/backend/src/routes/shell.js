/**
 * Shell & Automation Module
 * File Management, Cron Jobs, Package Management, System Time
 */
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const multer = require('multer');
const logger = require('../utils/logger');

const router = express.Router();

// Resolve the actual home directory of the running user
const USER_HOME = os.homedir() || `/home/${process.env.USER || 'codewalker'}`;

// Multer setup
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// ============ FILE MANAGEMENT ============

// GET /api/shell/files/list - List files in directory
router.get('/files/list', async (req, res) => {
  try {
    const { dir = USER_HOME } = req.query;

    if (dir.includes('..')) {
      return res.status(403).json({ error: 'Directory traversal not allowed' });
    }

    const files = await fs.readdir(dir, { withFileTypes: true });
    const fileList = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dir, file.name);
        try {
          const stat = await fs.stat(fullPath);
          return {
            name: file.name,
            type: file.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime,
            permissions: stat.mode.toString(8).slice(-3),
            isSymlink: file.isSymbolicLink()
          };
        } catch (err) {
          return null;
        }
      })
    );

    res.json({ 
      files: fileList.filter(f => f !== null), 
      directory: dir,
      count: fileList.filter(f => f !== null).length
    });
  } catch (err) {
    logger.error(`Failed to list files: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shell/files/read - Read file content
router.get('/files/read', async (req, res) => {
  try {
    const { file } = req.query;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const content = await fs.readFile(file, 'utf-8');
    const stat = await fs.stat(file);

    res.json({ 
      content, 
      file,
      size: stat.size,
      modified: stat.mtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/write - Write file content
router.post('/files/write', async (req, res) => {
  try {
    const { file, content } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.writeFile(file, content, 'utf-8');
    logger.info(`File written: ${file}`);

    res.json({ message: 'File written successfully', file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/create - Create new file
router.post('/files/create', async (req, res) => {
  try {
    const { file, content = '' } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.writeFile(file, content, 'utf-8');
    logger.info(`File created: ${file}`);

    res.json({ message: 'File created successfully', file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/delete - Delete file
router.post('/files/delete', async (req, res) => {
  try {
    const { file } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.unlink(file);
    logger.info(`File deleted: ${file}`);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/rename - Rename file
router.post('/files/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath || oldPath.includes('..') || newPath.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.rename(oldPath, newPath);
    logger.info(`File renamed: ${oldPath} -> ${newPath}`);

    res.json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/chmod - Change permissions
router.post('/files/chmod', (req, res) => {
  try {
    const { file, mode } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const chmod = spawn('chmod', [mode, file]);
    let error = '';

    chmod.stderr.on('data', (data) => {
      error += data.toString();
    });

    chmod.on('close', (code) => {
      if (res.headersSent) return;
      if (code === 0) {
        logger.info(`Permissions changed: ${file} to ${mode}`);
        res.json({ message: 'Permissions changed successfully' });
      } else {
        res.status(500).json({ error: error || 'Failed to change permissions' });
      }
    });
    chmod.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/scripts/save - Save a script for cron/automation
router.post('/scripts/save', async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const scriptsDir = path.join(USER_HOME, '.dashboard_scripts');
    try {
      await fs.mkdir(scriptsDir, { recursive: true });
    } catch (e) {}

    const filename = name || `script_${Date.now()}.sh`;
    const fullPath = path.join(scriptsDir, filename);

    await fs.writeFile(fullPath, content, 'utf-8');
    await fs.chmod(fullPath, 0o755); // Make executable

    res.json({ message: 'Script saved', path: fullPath, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/mkdir - Create directory
router.post('/files/mkdir', async (req, res) => {
  try {
    const { dir } = req.body;
    if (!dir || dir.includes('..')) return res.status(403).json({ error: 'Invalid directory path' });

    await fs.mkdir(dir, { recursive: true });
    logger.info(`Directory created: ${dir}`);
    res.json({ message: 'Directory created successfully', dir });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/files/upload - Upload file
router.post('/files/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`File uploaded: ${req.file.filename}`);

    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shell/files/home - Get user home directory
router.get('/files/home', (req, res) => {
  res.json({ home: USER_HOME, user: process.env.USER || os.userInfo().username });
});

// GET /api/shell/files/search - Search files
router.get('/files/search', (req, res) => {
  try {
    const { query, dir = '/home' } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const find = spawn('find', [dir, '-name', `*${query}*`, '-type', 'f']);
    let output = '';

    find.stdout.on('data', (data) => {
      output += data.toString();
    });

    find.on('close', () => {
      if (res.headersSent) return;
      const files = output.split('\n').filter(f => f.trim());
      res.json({ files, count: files.length });
    });

    find.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    setTimeout(() => {
      find.kill();
    }, 5000);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ============ CRON JOBS ============

// GET /api/shell/cron/list - List cron jobs
router.get('/cron/list', (req, res) => {
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
      if (res.headersSent) return;
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
          raw: line,
          schedule: `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`
        };
      });

      res.json({ jobs, count: jobs.length });
    });
    crontab.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/cron/add - Add cron job
router.post('/cron/add', (req, res) => {
  try {
    const { minute, hour, dayOfMonth, month, dayOfWeek, command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    const cronLine = `${minute || '*'} ${hour || '*'} ${dayOfMonth || '*'} ${month || '*'} ${dayOfWeek || '*'} ${command}`;

    const crontab = spawn('crontab', ['-l']);
    let currentCron = '';

    crontab.stdout.on('data', (data) => {
      currentCron += data.toString();
    });

    crontab.on('close', () => {
      const newCron = currentCron + '\n' + cronLine + '\n';

      const echo = spawn('bash', ['-c', `echo "${newCron.replace(/"/g, '\\"')}" | crontab -`]);

      echo.on('close', (code) => {
        if (code === 0) {
          logger.info(`Cron job added: ${cronLine}`);
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

// POST /api/shell/cron/remove - Remove cron job
router.post('/cron/remove', (req, res) => {
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

      const echo = spawn('bash', ['-c', `echo "${newCron.replace(/"/g, '\\"')}" | crontab -`]);

      echo.on('close', (code) => {
        if (code === 0) {
          logger.info(`Cron job removed: ID ${id}`);
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

// ============ PACKAGE MANAGEMENT ============

// GET /api/shell/packages/list - List installed packages
router.get('/packages/list', (req, res) => {
  try {
    const dpkg = spawn('dpkg', ['-l']);
    let output = '';

    dpkg.stdout.on('data', (data) => {
      output += data.toString();
    });

    dpkg.on('close', () => {
      if (res.headersSent) return;
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
    dpkg.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// GET /api/shell/packages/search - Search packages
router.get('/packages/search', (req, res) => {
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

    apt.on('close', () => {
      if (!res.headersSent) res.json({ results: output });
    });

    apt.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    setTimeout(() => {
      apt.kill();
    }, 10000);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/packages/install - Install package
router.post('/packages/install', (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg) {
      return res.status(400).json({ error: 'Package name required' });
    }

    logger.info(`Installing package: ${pkg}`);

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
      if (!res.headersSent) {
        res.json({
          message: code === 0 ? 'Package installed successfully' : 'Installation failed',
          output,
          error,
          success: code === 0
        });
      }
    });

    apt.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    setTimeout(() => {
      apt.kill();
    }, 60000);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/packages/remove - Remove package
router.post('/packages/remove', (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg) {
      return res.status(400).json({ error: 'Package name required' });
    }

    logger.info(`Removing package: ${pkg}`);

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

// ============ SYSTEM TIME ============

// GET /api/shell/time/info - Get time information
router.get('/time/info', (req, res) => {
  try {
    const timedatectl = spawn('timedatectl');
    let output = '';

    timedatectl.stdout.on('data', (data) => {
      output += data.toString();
    });

    timedatectl.on('close', () => {
      res.json({
        timezone: output,
        currentTime: new Date().toISOString(),
        timestamp: Date.now()
      });
    });

    timedatectl.on('error', () => {
      res.json({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date().toISOString(),
        timestamp: Date.now()
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/time/set - Set system time
router.post('/time/set', (req, res) => {
  try {
    const { datetime } = req.body;

    if (!datetime) {
      return res.status(400).json({ error: 'Datetime required' });
    }

    logger.info(`Setting system time to: ${datetime}`);

    const timedatectl = spawn('timedatectl', ['set-time', datetime]);
    let error = '';

    timedatectl.stderr.on('data', (data) => {
      error += data.toString();
    });

    timedatectl.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'System time updated successfully' });
      } else {
        res.status(500).json({ error: error || 'Failed to set time' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shell/time/timezone - Set timezone
router.post('/time/timezone', (req, res) => {
  try {
    const { timezone } = req.body;

    if (!timezone) {
      return res.status(400).json({ error: 'Timezone required' });
    }

    logger.info(`Setting timezone to: ${timezone}`);

    const timedatectl = spawn('timedatectl', ['set-timezone', timezone]);
    let error = '';

    timedatectl.stderr.on('data', (data) => {
      error += data.toString();
    });

    timedatectl.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'Timezone updated successfully' });
      } else {
        res.status(500).json({ error: error || 'Failed to set timezone' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
