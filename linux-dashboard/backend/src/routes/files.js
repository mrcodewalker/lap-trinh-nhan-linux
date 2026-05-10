/**
 * File Management Routes
 */
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Multer setup for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// GET /api/files/tree - Get file tree
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const { dir = '/home' } = req.query;

    // Security: prevent directory traversal
    if (dir.includes('..')) {
      return res.status(403).json({ error: 'Directory traversal not allowed' });
    }

    const ls = spawn('ls', ['-la', dir]);
    let output = '';

    ls.stdout.on('data', (data) => {
      output += data.toString();
    });

    ls.on('close', () => {
      res.json({ files: output, directory: dir });
    });

    ls.on('error', () => {
      res.status(404).json({ error: `Directory not found: ${dir}` });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/list - List files in directory
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { dir = '/home' } = req.query;

    if (dir.includes('..')) {
      return res.status(403).json({ error: 'Directory traversal not allowed' });
    }

    const files = await fs.readdir(dir, { withFileTypes: true });
    const fileList = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dir, file.name);
        const stat = await fs.stat(fullPath);
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtime,
          permissions: stat.mode.toString(8).slice(-3)
        };
      })
    );

    res.json({ files: fileList, directory: dir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/read - Read file content
router.get('/read', authenticateToken, async (req, res) => {
  try {
    const { file } = req.query;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const content = await fs.readFile(file, 'utf-8');
    res.json({ content, file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/write - Write file content
router.post('/write', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { file, content } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.writeFile(file, content, 'utf-8');
    logger.info(`File written: ${file} by ${req.user.username}`);

    res.json({ message: 'File written successfully', file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/upload - Upload file
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`File uploaded: ${req.file.filename} by ${req.user.username}`);

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

// DELETE /api/files/delete - Delete file
router.delete('/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { file } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.unlink(file);
    logger.info(`File deleted: ${file} by ${req.user.username}`);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/rename - Rename file
router.post('/rename', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath || oldPath.includes('..') || newPath.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    await fs.rename(oldPath, newPath);
    logger.info(`File renamed: ${oldPath} -> ${newPath} by ${req.user.username}`);

    res.json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/chmod - Change file permissions
router.post('/chmod', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { file, mode } = req.body;

    if (!file || file.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const chmod = spawn('chmod', [mode, file]);

    chmod.on('close', (code) => {
      if (code === 0) {
        logger.info(`Permissions changed: ${file} to ${mode} by ${req.user.username}`);
        res.json({ message: 'Permissions changed successfully' });
      } else {
        res.status(500).json({ error: 'Failed to change permissions' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/search - Search files
router.get('/search', authenticateToken, (req, res) => {
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
      const files = output.split('\n').filter(f => f.trim());
      res.json({ files, count: files.length });
    });

    setTimeout(() => {
      find.kill();
    }, 5000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
