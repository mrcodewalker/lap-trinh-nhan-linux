/**
 * Strace integration — chạy strace thật trên một command hoặc PID,
 * trả counts theo syscall (HTTP) và streaming line-by-line (Socket).
 */
const express = require('express');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const activity = require('../utils/activity');

const router = express.Router();

/* GET /api/strace/check — kiểm tra strace có sẵn không */
router.get('/check', (req, res) => {
  const r = spawn('strace', ['-V']);
  let out = '';
  r.stdout.on('data', d => out += d);
  r.stderr.on('data', d => out += d);
  r.on('close', code => {
    if (res.headersSent) return;
    res.json({ available: code === 0, version: out.trim() });
  });
  r.on('error', () => {
    if (res.headersSent) return;
    res.json({ available: false, hint: 'sudo apt install strace' });
  });
});

/* POST /api/strace/summary { command }
 * Chạy `strace -c -f -- <command>` lấy bảng count syscall.
 */
router.post('/summary', (req, res) => {
  const { command } = req.body || {};
  if (!command) return res.status(400).json({ error: 'command required' });

  const proc = spawn('strace', ['-c', '-f', '--', 'bash', '-c', command]);
  let stdout = '', stderr = '';
  proc.stdout.on('data', d => stdout += d);
  proc.stderr.on('data', d => stderr += d);

  const t = setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) { } }, 15000);

  proc.on('close', code => {
    clearTimeout(t);
    if (res.headersSent) return;
    const summary = stderr;
    const rows = parseSummary(summary);
    activity.log({ scope: 'strace', command: `strace -c -f -- bash -c "${command}"`, code, output: summary.slice(0, 800) });
    res.json({ code, command, stdout, summary, rows });
  });

  proc.on('error', err => {
    clearTimeout(t);
    if (res.headersSent) return;
    res.status(500).json({ error: err.message, hint: 'install strace: sudo apt install strace' });
  });
});

/* POST /api/strace/trace - Trace system calls of a running process */
router.post('/trace', (req, res) => {
  try {
    const { pid, duration = 5 } = req.body;
    if (!pid) return res.status(400).json({ error: 'PID required' });

    const strace = spawn('strace', ['-p', pid.toString(), '-c', '-S', 'calls']);
    let output = '', error = '';

    strace.stdout.on('data', (data) => { output += data.toString(); });
    strace.stderr.on('data', (data) => { error += data.toString(); });

    const timer = setTimeout(() => {
      if (!strace.killed) strace.kill('SIGINT');
    }, parseInt(duration) * 1000);

    strace.on('close', (code) => {
      clearTimeout(timer);
      if (res.headersSent) return;
      activity.log({ scope: 'strace', command: `strace -p ${pid} -c`, code, output: (error || output).slice(0, 800) });
      res.json({ result: error || output, success: true, pid, duration });
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

/* GET /api/strace/syscalls/:pid - Quick syscall summary */
router.get('/syscalls/:pid', (req, res) => {
  try {
    const { pid } = req.params;
    const strace = spawn('strace', ['-p', pid, '-c', '-S', 'calls']);
    let output = '', error = '';

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

function parseSummary(text) {
  const lines = text.split('\n');
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^\s*([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(?:(\d+)\s+)?(\S+)\s*$/);
    if (m) {
      rows.push({
        pctTime: parseFloat(m[1]),
        seconds: parseFloat(m[2]),
        usecsPerCall: parseInt(m[3], 10),
        calls: parseInt(m[4], 10),
        errors: m[5] ? parseInt(m[5], 10) : 0,
        syscall: m[6],
      });
    }
  }
  return rows;
}

/* Socket: strace:start { command, sid } → streams lines */
function attachStraceSocket(socket) {
  socket.on('strace:start', ({ command, sid }) => {
    if (!command) return socket.emit('strace:done', { sid, error: 'command required' });

    const argv = ['-f', '-tt', '-T', '-s', '120', '--', 'bash', '-c', command];
    const proc = spawn('strace', argv);
    socket.emit('strace:line', { sid, line: `$ strace ${argv.join(' ')}`, level: 'info' });

    const onData = (level) => (d) =>
      d.toString().split('\n').forEach(line => {
        if (line.length) socket.emit('strace:line', { sid, line, level });
      });

    proc.stdout.on('data', onData('info'));
    proc.stderr.on('data', onData('info'));

    const t = setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) { } }, 30000);

    proc.on('close', code => {
      clearTimeout(t);
      activity.log({ scope: 'strace', command: `strace ${argv.join(' ')}`, code });
      socket.emit('strace:done', { sid, code });
    });
    proc.on('error', err => {
      clearTimeout(t);
      socket.emit('strace:line', { sid, line: `[error] ${err.message}`, level: 'error' });
      socket.emit('strace:done', { sid, code: -1, error: err.message });
    });

    socket.once('strace:cancel', () => { try { proc.kill('SIGTERM'); } catch (_) { } });
  });
}

module.exports = router;
module.exports.attachStraceSocket = attachStraceSocket;
