/**
 * Socket.IO Manager — Real-time communication
 */
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const activeSessions = new Map();

// kernel-modules dir: backend/kernel-modules/
const MODULES_DIR = path.join(__dirname, '../../kernel-modules');

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    activeSessions.set(socket.id, { connectedAt: new Date() });
    io.emit('sessions:update', { activeCount: activeSessions.size });

    // ── TERMINAL ──────────────────────────────────────────────
    socket.on('terminal:execute', (data) => {
      const { command, id } = data;
      logger.info(`Executing: ${command}`);
      try {
        const proc = spawn('bash', ['-c', command]);
        proc.stdout.on('data', (d) => socket.emit('terminal:output', { id, data: d.toString() }));
        proc.stderr.on('data', (d) => socket.emit('terminal:error',  { id, error: d.toString() }));
        proc.on('close', (code) => socket.emit('terminal:close', { id, code }));
        proc.on('error', (err) => {
          logger.error(`Terminal spawn error: ${err.message}`);
          socket.emit('terminal:error', { id, error: `Failed to start terminal: ${err.message}` });
        });
        setTimeout(() => {
          if (proc.exitCode === null) { proc.kill(); socket.emit('terminal:timeout', { id }); }
        }, 30000);
      } catch (err) {
        socket.emit('terminal:error', { id, error: err.message });
      }
    });

    // ── KERNEL COMPILE (streaming) ────────────────────────────
    socket.on('kernel:compile', async (data) => {
      const { code, moduleName = 'custom_module', autoLoad = false, sessionId } = data;
      const sid = sessionId || Date.now().toString();
      const kEmit = (type, payload) => socket.emit('kernel:compile:' + type, { sid, ...payload });

      kEmit('start', { moduleName });

      try {
        const moduleDir  = path.join(MODULES_DIR, moduleName);
        const sourceFile = path.join(moduleDir, `${moduleName}.c`);
        const makeFile   = path.join(moduleDir, 'Makefile');

        await fs.mkdir(moduleDir, { recursive: true });
        await fs.writeFile(sourceFile, code, 'utf-8');
        kEmit('log', { line: `[write] ${sourceFile}`, level: 'info' });

        // Use CURDIR (set by make itself to the directory it was invoked from)
        // so M= always points to moduleDir regardless of Node's cwd.
        const makefile = `obj-m += ${moduleName}.o\n\nall:\n\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) modules\n\nclean:\n\tmake -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) clean\n\n.PHONY: all clean\n`;
        await fs.writeFile(makeFile, makefile, 'utf-8');
        kEmit('log', { line: '[write] Makefile', level: 'info' });
        kEmit('log', { line: `[make] Building ${moduleName}.ko ...`, level: 'info' });

        // Run make with cwd=moduleDir so CURDIR resolves correctly
        const make = spawn('make', [], { cwd: moduleDir });
        let buildOutput = '';
        let buildError  = '';

        const streamLines = (text, defaultLevel) => {
          text.split('\n').filter(l => l.trim()).forEach(line => {
            const level = line.toLowerCase().includes('error') ? 'error'
                        : line.toLowerCase().includes('warn')  ? 'warn'
                        : defaultLevel;
            kEmit('log', { line, level });
          });
        };

        make.stdout.on('data', (d) => { buildOutput += d; streamLines(d.toString(), 'info'); });
        make.stderr.on('data', (d) => { buildError  += d; streamLines(d.toString(), 'warn'); });

        make.on('close', async (exitCode) => {
          if (exitCode !== 0) {
            kEmit('done', { success: false, error: 'Build failed', buildOutput, buildError });
            return;
          }
          const koFile = path.join(moduleDir, `${moduleName}.ko`);
          kEmit('log', { line: `[ok] Built: ${koFile}`, level: 'success' });

          if (!autoLoad) {
            kEmit('done', { success: true, koFile, loaded: false });
            return;
          }

          kEmit('log', { line: `[insmod] Loading ${moduleName}.ko into kernel...`, level: 'info' });
          const insmod = spawn('sudo', ['insmod', koFile]);
          let insmodErr = '';
          insmod.stderr.on('data', (d) => { insmodErr += d.toString(); });
          insmod.on('close', (lc) => {
            if (lc === 0) {
              kEmit('log', { line: '[ok] Module loaded! Check dmesg for output.', level: 'success' });
              kEmit('done', { success: true, koFile, loaded: true });
            } else {
              kEmit('log', { line: `[error] insmod: ${insmodErr.trim()}`, level: 'error' });
              kEmit('done', { success: true, koFile, loaded: false, loadError: insmodErr });
            }
          });
          insmod.on('error', (err) => {
            kEmit('log', { line: `[error] Failed to start insmod: ${err.message}`, level: 'error' });
            kEmit('done', { success: false, error: `insmod failed: ${err.message}` });
          });
        });

        make.on('error', (err) => {
          kEmit('log', { line: `[error] Failed to start make: ${err.message}`, level: 'error' });
          kEmit('done', { success: false, error: `make failed: ${err.message}` });
        });

        setTimeout(() => {
          make.kill();
          kEmit('log', { line: '[timeout] Build timed out after 60s', level: 'error' });
        }, 60000);

      } catch (err) {
        kEmit('log', { line: `[error] ${err.message}`, level: 'error' });
        kEmit('done', { success: false, error: err.message });
      }
    });

    // ── DMESG LIVE WATCH ──────────────────────────────────────
    socket.on('kernel:dmesg:watch', async () => {
      logger.info('dmesg watch started');
      
      // Try dmesg without sudo first (some systems allow it or have it configured)
      // then try with sudo -n (non-interactive) to avoid hanging on password prompt
      let dmesg;
      try {
        // Test if dmesg works without sudo
        const test = spawn('dmesg', ['-n', '1']); // just a quick test
        const works = await new Promise(res => test.on('close', code => res(code === 0)));
        
        if (works) {
          dmesg = spawn('dmesg', ['-w', '--color=never']);
        } else {
          // Try with sudo -n (non-interactive)
          dmesg = spawn('sudo', ['-n', 'dmesg', '-w', '--color=never']);
        }
      } catch (e) {
        socket.emit('kernel:dmesg:line', { line: `[error] Failed to start dmesg: ${e.message}` });
        return;
      }

      dmesg.stdout.on('data', (d) => {
        d.toString().split('\n').filter(l => l.trim()).forEach(line => {
          socket.emit('kernel:dmesg:line', { line });
        });
      });

      dmesg.stderr.on('data', (d) => {
        const err = d.toString().trim();
        if (err) {
          if (err.includes('password') || err.includes('sudo')) {
            socket.emit('kernel:dmesg:line', { 
              line: `[error] sudo requires password. Run 'sudo chmod +s /bin/dmesg' or configure NOPASSWD in sudoers for this user.` 
            });
          } else {
            socket.emit('kernel:dmesg:line', { line: `[error] ${err}` });
          }
        }
      });

      const stop = () => { try { dmesg.kill(); } catch { /* ignore */ } };
      socket.once('kernel:dmesg:stop', stop);
      socket.once('disconnect', stop);
    });

    // ── SYSTEM METRICS ────────────────────────────────────────
    socket.on('metrics:start', () => {
      const interval = setInterval(() => {
        const top = spawn('top', ['-b', '-n', '1']);
        let out = '';
        top.stdout.on('data', (d) => { out += d; });
        top.on('close', () => socket.emit('metrics:update', { data: out }));
        top.on('error', (err) => {
          logger.error(`Metrics spawn error: ${err.message}`);
          socket.emit('metrics:error', { error: 'top command not found' });
        });
      }, 2000);
      socket.once('metrics:stop', () => clearInterval(interval));
      socket.once('disconnect',   () => clearInterval(interval));
    });

    // ── FILE WATCHING ─────────────────────────────────────────
    socket.on('files:watch', (data) => {
      const { path: filePath } = data;
      if (!filePath || filePath.includes('..')) {
        socket.emit('files:error', { error: 'Invalid path' });
        return;
      }
      try {
        const watch = spawn('inotifywait', ['-m', '-e', 'modify,create,delete', filePath]);
        watch.stdout.on('data', (d) =>
          socket.emit('files:change', { path: filePath, event: d.toString() })
        );
        watch.on('error', (err) => {
          logger.error(`inotifywait spawn error: ${err.message}`);
          socket.emit('files:error', { error: 'inotifywait command not found. Install inotify-tools.' });
        });
        const stop = () => { try { watch.kill(); } catch { /* ignore */ } };
        socket.once('files:unwatch', stop);
        socket.once('disconnect',    stop);
      } catch (err) {
        socket.emit('files:error', { error: err.message });
      }
    });

    // ── PACKAGE MANAGEMENT (streaming) ────────────────────────
    socket.on('packages:install', (data) => {
      const { name, id } = data;
      logger.info(`Socket Install: ${name}`);
      try {
        const apt = spawn('sudo', ['-n', 'apt-get', 'install', '-y', name]);
        apt.stdout.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
        apt.stderr.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
        apt.on('close', (code) => socket.emit('packages:close', { id, code }));
        apt.on('error', (err) => {
          socket.emit('packages:output', { id, data: `Error: ${err.message}\n` });
          socket.emit('packages:close', { id, code: 1 });
        });
      } catch (err) {
        socket.emit('packages:output', { id, data: `Fatal: ${err.message}\n` });
        socket.emit('packages:close', { id, code: 1 });
      }
    });

    socket.on('packages:remove', (data) => {
      const { name, id } = data;
      logger.info(`Socket Remove: ${name}`);
      try {
        const apt = spawn('sudo', ['-n', 'apt-get', 'remove', '-y', name]);
        apt.stdout.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
        apt.stderr.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
        apt.on('close', (code) => socket.emit('packages:close', { id, code }));
        apt.on('error', (err) => {
          socket.emit('packages:output', { id, data: `Error: ${err.message}\n` });
          socket.emit('packages:close', { id, code: 1 });
        });
      } catch (err) {
        socket.emit('packages:output', { id, data: `Fatal: ${err.message}\n` });
        socket.emit('packages:close', { id, code: 1 });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      activeSessions.delete(socket.id);
      logger.info(`Client disconnected: ${socket.id}`);
      io.emit('sessions:update', { activeCount: activeSessions.size });
    });
  });
}

module.exports = { initSocketHandlers, activeSessions };
