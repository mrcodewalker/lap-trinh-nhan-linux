/**
 * Socket.IO Manager - Real-time communication
 * No authentication - direct system access
 */
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

const activeSessions = new Map();

// Resolve kernel-samples directory relative to this file
const SAMPLES_DIR = path.join(__dirname, '../../../kernel-samples');
const MODULES_DIR = path.join(__dirname, '../../kernel-modules');

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    activeSessions.set(socket.id, { connectedAt: new Date() });
    io.emit('sessions:update', { activeCount: activeSessions.size });

    // ============ TERMINAL EXECUTION ============
    socket.on('terminal:execute', (data) => {
      const { command, id } = data;
      logger.info(`Executing command: ${command}`);
      try {
        const proc = spawn('bash', ['-c', command]);
        proc.stdout.on('data', (d) => socket.emit('terminal:output', { id, data: d.toString() }));
        proc.stderr.on('data', (d) => socket.emit('terminal:error',  { id, error: d.toString() }));
        proc.on('close', (code) => socket.emit('terminal:close', { id, code }));
        setTimeout(() => { if (proc.exitCode === null) { proc.kill(); socket.emit('terminal:timeout', { id }) } }, 30000);
      } catch (err) {
        socket.emit('terminal:error', { id, error: err.message });
      }
    });

    // ============ KERNEL: COMPILE MODULE (streaming) ============
    socket.on('kernel:compile', async (data) => {
      const { code, moduleName = 'custom_module', autoLoad = false, sessionId } = data;
      const sid = sessionId || Date.now();

      const emit = (type, payload) => socket.emit('kernel:compile:' + type, { sid, ...payload });

      emit('start', { moduleName });

      try {
        // 1. Write source file
        const moduleDir = path.join(MODULES_DIR, moduleName);
        await fs.mkdir(moduleDir, { recursive: true });

        const sourceFile = path.join(moduleDir, `${moduleName}.c`);
        const makeFile   = path.join(moduleDir, 'Makefile');

        await fs.writeFile(sourceFile, code, 'utf-8');
        emit('log', { line: `[write] ${sourceFile}`, level: 'info' });

        // 2. Write Makefile
        const makefile = `obj-m += ${moduleName}.o\n\nall:\n\tmake -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules\n\nclean:\n\tmake -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean\n\n.PHONY: all clean\n`;
        await fs.writeFile(makeFile, makefile, 'utf-8');
        emit('log', { line: `[write] Makefile`, level: 'info' });

        // 3. Run make — stream output line by line
        emit('log', { line: `[make] Building ${moduleName}.ko ...`, level: 'info' });

        const make = spawn('make', ['-C', moduleDir]);
        let buildOutput = '';
        let buildError  = '';

        make.stdout.on('data', (d) => {
          const text = d.toString();
          buildOutput += text;
          text.split('\n').filter(l => l.trim()).forEach(line => {
            const level = line.toLowerCase().includes('error') ? 'error'
                        : line.toLowerCase().includes('warn')  ? 'warn'
                        : 'info';
            emit('log', { line, level });
          });
        });

        make.stderr.on('data', (d) => {
          const text = d.toString();
          buildError += text;
          text.split('\n').filter(l => l.trim()).forEach(line => {
            const level = line.toLowerCase().includes('error') ? 'error' : 'warn';
            emit('log', { line, level });
          });
        });

        make.on('close', async (code) => {
          if (code !== 0) {
            emit('done', { success: false, error: 'Build failed', buildOutput, buildError });
            return;
          }

          const koFile = path.join(moduleDir, `${moduleName}.ko`);
          emit('log', { line: `[ok] Built: ${koFile}`, level: 'success' });

          if (!autoLoad) {
            emit('done', { success: true, koFile, loaded: false });
            return;
          }

          // 4. insmod — load into kernel
          emit('log', { line: `[insmod] Loading ${moduleName}.ko into kernel...`, level: 'info' });

          const insmod = spawn('insmod', [koFile]);
          let insmodErr = '';

          insmod.stderr.on('data', (d) => { insmodErr += d.toString(); });

          insmod.on('close', (lcode) => {
            if (lcode === 0) {
              emit('log', { line: `[ok] Module loaded! Check dmesg for output.`, level: 'success' });
              emit('done', { success: true, koFile, loaded: true });
            } else {
              emit('log', { line: `[error] insmod failed: ${insmodErr}`, level: 'error' });
              emit('done', { success: true, koFile, loaded: false, loadError: insmodErr });
            }
          });
        });

        setTimeout(() => { make.kill(); emit('log', { line: '[timeout] Build timed out', level: 'error' }); }, 60000);

      } catch (err) {
        emit('log', { line: `[error] ${err.message}`, level: 'error' });
        emit('done', { success: false, error: err.message });
      }
    });

    // ============ KERNEL: DMESG TAIL (streaming) ============
    socket.on('kernel:dmesg:watch', () => {
      logger.info('dmesg watch started');
      const dmesg = spawn('dmesg', ['-w', '--color=never']);

      dmesg.stdout.on('data', (d) => {
        d.toString().split('\n').filter(l => l.trim()).forEach(line => {
          socket.emit('kernel:dmesg:line', { line });
        });
      });

      socket.on('kernel:dmesg:stop', () => { dmesg.kill(); });
      socket.on('disconnect', () => { dmesg.kill(); });
    });

    // ============ METRICS STREAMING ============
    socket.on('metrics:start', () => {
      const interval = setInterval(() => {
        const top = spawn('top', ['-b', '-n', '1']);
        let output = '';
        top.stdout.on('data', (d) => { output += d.toString(); });
        top.on('close', () => socket.emit('metrics:update', { data: output }));
      }, 2000);
      socket.on('metrics:stop', () => clearInterval(interval));
      socket.on('disconnect', () => clearInterval(interval));
    });

    // ============ FILE WATCHING ============
    socket.on('files:watch', (data) => {
      const { path: filePath } = data;
      if (!filePath || filePath.includes('..')) { socket.emit('files:error', { error: 'Invalid path' }); return; }
      try {
        const watch = spawn('inotifywait', ['-m', '-e', 'modify,create,delete', filePath]);
        watch.stdout.on('data', (d) => socket.emit('files:change', { path: filePath, event: d.toString() }));
        socket.on('files:unwatch', () => watch.kill());
        socket.on('disconnect', () => watch.kill());
      } catch (err) { socket.emit('files:error', { error: err.message }); }
    });

    // ============ DISCONNECT ============
    socket.on('disconnect', () => {
      activeSessions.delete(socket.id);
      logger.info(`Client disconnected: ${socket.id}`);
      io.emit('sessions:update', { activeCount: activeSessions.size });
    });
  });
}

module.exports = { initSocketHandlers, activeSessions };

const activeSessions = new Map();

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    activeSessions.set(socket.id, { connectedAt: new Date() });

    // Broadcast active sessions count
    io.emit('sessions:update', { activeCount: activeSessions.size });

    // ============ TERMINAL EXECUTION ============
    socket.on('terminal:execute', (data) => {
      const { command, id } = data;

      logger.info(`Executing command: ${command}`);

      try {
        const proc = spawn('bash', ['-c', command]);
        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => {
          output += data.toString();
          socket.emit('terminal:output', { id, data: data.toString() });
        });

        proc.stderr.on('data', (data) => {
          error += data.toString();
          socket.emit('terminal:error', { id, error: data.toString() });
        });

        proc.on('close', (code) => {
          socket.emit('terminal:close', { id, code, output, error });
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (proc.exitCode === null) {
            proc.kill();
            socket.emit('terminal:timeout', { id });
          }
        }, 30000);
      } catch (err) {
        socket.emit('terminal:error', { id, error: err.message });
      }
    });

    // ============ SYSTEM METRICS STREAMING ============
    socket.on('metrics:start', () => {
      logger.info(`Metrics streaming started`);

      const interval = setInterval(() => {
        const top = spawn('top', ['-b', '-n', '1']);
        let output = '';

        top.stdout.on('data', (data) => {
          output += data.toString();
        });

        top.on('close', () => {
          socket.emit('metrics:update', { data: output });
        });
      }, 2000);

      socket.on('metrics:stop', () => {
        clearInterval(interval);
        logger.info(`Metrics streaming stopped`);
      });

      socket.on('disconnect', () => {
        clearInterval(interval);
      });
    });

    // ============ PROCESS MONITORING ============
    socket.on('process:monitor', (data) => {
      const { pid } = data;

      logger.info(`Monitoring process ${pid}`);

      const interval = setInterval(() => {
        const ps = spawn('ps', ['-p', pid, '-o', 'pid,vsz,rss,comm']);
        let output = '';

        ps.stdout.on('data', (data) => {
          output += data.toString();
        });

        ps.on('close', () => {
          socket.emit('process:update', { pid, data: output });
        });
      }, 1000);

      socket.on('process:stop-monitor', () => {
        clearInterval(interval);
      });

      socket.on('disconnect', () => {
        clearInterval(interval);
      });
    });

    // ============ KERNEL LOG STREAMING ============
    socket.on('kernel:logs-stream', () => {
      logger.info(`Kernel logs streaming started`);

      const dmesg = spawn('dmesg', ['-w']);

      dmesg.stdout.on('data', (data) => {
        socket.emit('kernel:log', { message: data.toString() });
      });

      socket.on('kernel:stop-stream', () => {
        dmesg.kill();
      });

      socket.on('disconnect', () => {
        dmesg.kill();
      });
    });

    // ============ FILE WATCHING ============
    socket.on('files:watch', (data) => {
      const { path: filePath } = data;

      if (!filePath || filePath.includes('..')) {
        socket.emit('files:error', { error: 'Invalid path' });
        return;
      }

      logger.info(`Watching file: ${filePath}`);

      try {
        const watch = spawn('inotifywait', ['-m', '-e', 'modify,create,delete', filePath]);

        watch.stdout.on('data', (data) => {
          socket.emit('files:change', { path: filePath, event: data.toString() });
        });

        socket.on('files:unwatch', () => {
          watch.kill();
        });
      } catch (err) {
        socket.emit('files:error', { error: err.message });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      activeSessions.delete(socket.id);
      logger.info(`Client disconnected: ${socket.id}`);
      io.emit('sessions:update', { activeCount: activeSessions.size });
    });

    // Error handler
    socket.on('error', (err) => {
      logger.error(`Socket error: ${err.message}`);
    });
  });
}

module.exports = { initSocketHandlers, activeSessions };
