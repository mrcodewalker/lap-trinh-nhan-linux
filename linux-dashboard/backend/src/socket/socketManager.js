/**
 * Socket.IO Manager - Real-time communication
 * No authentication - direct system access
 */
const { spawn } = require('child_process');
const logger = require('../utils/logger');

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
