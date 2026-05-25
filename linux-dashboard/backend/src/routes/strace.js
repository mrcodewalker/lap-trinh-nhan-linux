/**
 * Strace Route - System call tracing
 */
const express = require('express');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/strace/trace - Trace system calls of a process
router.post('/trace', (req, res) => {
    try {
        const { pid, duration = 5 } = req.body;

        if (!pid) {
            return res.status(400).json({ error: 'PID required' });
        }

        const strace = spawn('strace', ['-p', pid.toString(), '-c', '-S', 'calls'], {
            timeout: (parseInt(duration) + 2) * 1000
        });
        let output = '';
        let error = '';

        strace.stdout.on('data', (data) => {
            output += data.toString();
        });

        strace.stderr.on('data', (data) => {
            error += data.toString();
        });

        // Kill strace after duration
        const timer = setTimeout(() => {
            if (!strace.killed) strace.kill('SIGINT');
        }, parseInt(duration) * 1000);

        strace.on('close', (code) => {
            clearTimeout(timer);
            if (res.headersSent) return;
            // strace outputs to stderr
            res.json({
                result: error || output,
                success: true,
                pid,
                duration
            });
        });

        strace.on('error', (err) => {
            clearTimeout(timer);
            if (res.headersSent) return;
            logger.error(`strace failed: ${err.message}`);
            res.status(500).json({ error: 'strace failed: ' + err.message });
        });

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// GET /api/strace/syscalls/:pid - Quick syscall summary
router.get('/syscalls/:pid', (req, res) => {
    try {
        const { pid } = req.params;

        const strace = spawn('strace', ['-p', pid, '-c', '-S', 'calls'], {
            timeout: 4000
        });
        let output = '';
        let error = '';

        strace.stdout.on('data', (data) => { output += data.toString(); });
        strace.stderr.on('data', (data) => { error += data.toString(); });

        const timer = setTimeout(() => {
            if (!strace.killed) strace.kill('SIGINT');
        }, 3000);

        strace.on('close', () => {
            clearTimeout(timer);
            if (res.headersSent) return;
            res.json({ result: error || output, pid });
        });

        strace.on('error', (err) => {
            clearTimeout(timer);
            if (res.headersSent) return;
            res.status(500).json({ error: 'strace not available: ' + err.message });
        });

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

module.exports = router;
