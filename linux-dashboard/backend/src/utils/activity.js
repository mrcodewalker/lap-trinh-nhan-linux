/**
 * Activity bus — broadcast các sự kiện "đã thực thi command thật"
 * tới tất cả Socket.IO client. Frontend lọc theo scope/category để
 * hiển thị đúng panel.
 *
 *   const activity = require('../utils/activity');
 *   activity.attachIO(io);  // gọi 1 lần lúc bootstrap
 *
 *   // emit khi đã chạy xong:
 *   activity.log({
 *     scope: 'files',           // files | process | kernel | cron | packages | system | network | demo | strace
 *     command: 'chmod 755 a',   // command thật
 *     code: 0,                  // exit code (0 success, !=0 error). Có thể null cho "info".
 *     output: '...optional snippet...',
 *     level: 'info' | 'success' | 'error' | 'warn',
 *     meta: { ... }
 *   });
 *
 *   // wrap spawn để tự log:
 *   activity.run('files', ['chmod','755','/tmp/a']) → Promise<{code,stdout,stderr}>
 */
const { spawn } = require('child_process');
const logger = require('./logger');

let ioRef = null;
const ringBuffer = [];   // last 500 entries cho late subscribers
const MAX_RING   = 500;

function attachIO(io) {
  ioRef = io;

  // Late subscriber: trả 100 entry gần nhất khi client bật ActivityLog
  io.on('connection', socket => {
    socket.on('activity:replay', ({ scope, limit = 100 } = {}) => {
      const list = ringBuffer
        .filter(e => !scope || scope === 'all' || e.scope === scope)
        .slice(-limit);
      socket.emit('activity:replay', { scope: scope || 'all', entries: list });
    });
  });
}

function log(entry) {
  const e = {
    id   : Date.now() + ':' + Math.random().toString(36).slice(2, 7),
    ts   : new Date().toISOString(),
    scope: entry.scope || 'system',
    command: entry.command || '',
    code : entry.code ?? null,
    output: typeof entry.output === 'string' ? entry.output.slice(0, 4000) : '',
    level: entry.level || (entry.code === 0 ? 'success' : entry.code != null ? 'error' : 'info'),
    meta : entry.meta || {},
  };

  ringBuffer.push(e);
  if (ringBuffer.length > MAX_RING) ringBuffer.shift();

  if (ioRef) ioRef.emit('activity:log', e);
  logger.info(`[activity:${e.scope}] ${e.command} → ${e.code}`);
  return e;
}

/* Spawn helper: chạy command thật, gom output, log, trả Promise. */
function run(scope, argv, opts = {}) {
  return new Promise((resolve) => {
    const cmd  = argv[0];
    const args = argv.slice(1);
    const ts0  = Date.now();
    const proc = spawn(cmd, args, opts);
    let stdout = '', stderr = '';

    proc.stdout?.on('data', d => stdout += d);
    proc.stderr?.on('data', d => stderr += d);

    const tmo = opts.timeout
      ? setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) {} }, opts.timeout)
      : null;

    proc.on('close', code => {
      if (tmo) clearTimeout(tmo);
      const ms = Date.now() - ts0;
      log({
        scope,
        command: argv.join(' '),
        code,
        output: stdout || stderr,
        meta: { durationMs: ms, ...(opts.meta || {}) },
      });
      resolve({ code, stdout, stderr });
    });

    proc.on('error', err => {
      if (tmo) clearTimeout(tmo);
      log({
        scope,
        command: argv.join(' '),
        code: -1,
        level: 'error',
        output: err.message,
      });
      resolve({ code: -1, stdout: '', stderr: err.message });
    });
  });
}

module.exports = { attachIO, log, run };
