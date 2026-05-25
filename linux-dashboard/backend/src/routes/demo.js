/**
 * Demo Scenarios — chạy THẬT các kịch bản Linux Programming.
 *
 *   GET  /api/demo/scenarios              → danh sách kịch bản
 *   POST /api/demo/run                    → chạy 1 kịch bản (HTTP, trả output 1 lần)
 *   Socket event: demo:run / demo:cancel  → streaming realtime
 *
 * Mỗi scenario được map sang một command thật. Backend sẽ tự build các
 * binary trong kernel-samples/userspace-demos/ nếu thiếu.
 */
const express = require('express');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const activity = require('../utils/activity');

const router = express.Router();

const REPO_ROOT   = path.resolve(__dirname, '../../../');
const DEMOS_DIR   = path.join(REPO_ROOT, 'kernel-samples', 'userspace-demos');
const KSAMPLES    = path.join(REPO_ROOT, 'kernel-samples');

// ──────────────────────────────────────────────────────────────
// Scenario catalog — mỗi scenario là 1 lệnh + giải thích.
// ──────────────────────────────────────────────────────────────
const SCENARIOS = {
  'process-fork': {
    title: 'Fork + Exec + Wait',
    category: 'process',
    needsBuild: ['fork_demo'],
    cmd: () => ['./fork_demo', '3'],
    cwd: DEMOS_DIR,
    timeout: 10_000,
    explain: {
      summary: 'Demo fork() + execvp() + waitpid() trên 3 child.',
      syscalls: ['fork', 'execve', 'waitpid'],
      concepts: ['Process creation', 'COW address space', 'Reap pattern'],
    },
  },
  'process-zombie': {
    title: 'Zombie process (defunct)',
    category: 'process',
    needsBuild: ['zombie_demo'],
    cmd: () => ['./zombie_demo', '6'],
    cwd: DEMOS_DIR,
    timeout: 12_000,
    explain: {
      summary: 'Child exit nhưng parent không wait → state Z (defunct).',
      syscalls: ['fork', 'exit', 'wait'],
      concepts: ['Zombie state', 'Process accounting', 'SIGCHLD'],
      verify: 'ps -o pid,stat,comm <child_pid>',
    },
  },
  'process-orphan': {
    title: 'Orphan process (reparent về init)',
    category: 'process',
    needsBuild: ['orphan_demo'],
    cmd: () => ['./orphan_demo'],
    cwd: DEMOS_DIR,
    timeout: 12_000,
    explain: {
      summary: 'Parent exit trước child → kernel reparent child về PID 1.',
      syscalls: ['fork', 'exit'],
      concepts: ['Reparenting', 'init/systemd', 'PPID'],
    },
  },
  'ipc-uds': {
    title: 'UNIX Domain Socket (parent↔child)',
    category: 'ipc',
    needsBuild: ['uds_demo'],
    cmd: () => ['./uds_demo'],
    cwd: DEMOS_DIR,
    timeout: 5_000,
    explain: {
      summary: 'socketpair(AF_UNIX) tạo cặp fd nối nhau, IPC sau fork.',
      syscalls: ['socketpair', 'fork', 'read', 'write'],
      concepts: ['UDS', 'Bidirectional IPC', 'No network stack'],
    },
  },
  'net-tcp-roundtrip': {
    title: 'TCP echo (server + client)',
    category: 'network',
    needsBuild: ['tcp_echo_server', 'tcp_echo_client'],
    /* Spawn server in background, then client; kill server at end. */
    custom: 'tcpRoundTrip',
    timeout: 15_000,
    explain: {
      summary: 'Server bind+listen+accept, client connect+write+read echo.',
      syscalls: ['socket', 'bind', 'listen', 'accept', 'connect', 'read', 'write'],
      concepts: ['TCP three-way handshake', 'Socket API', 'Loopback'],
    },
  },
  'kernel-load-hello': {
    title: 'Load kernel module hello_module',
    category: 'kernel',
    custom: 'loadHello',
    timeout: 30_000,
    explain: {
      summary: 'sudo insmod hello_module.ko → printk → dmesg → rmmod.',
      syscalls: ['init_module', 'delete_module'],
      concepts: ['LKM', 'printk', 'module_init/exit'],
      verify: 'sudo dmesg | tail',
    },
  },
  'kernel-proc-readwrite': {
    title: 'Proc module: read & write /proc/dashboard',
    category: 'kernel',
    custom: 'procRW',
    timeout: 30_000,
    explain: {
      summary: 'Load proc_module, write một message qua /proc, đọc lại.',
      syscalls: ['open', 'read', 'write', 'close'],
      concepts: ['/proc filesystem', 'seq_file', 'copy_from_user'],
    },
  },
  'kernel-chardev-roundtrip': {
    title: 'Character device: echo > /dev/dashboard && cat',
    category: 'kernel',
    custom: 'chardevRT',
    timeout: 30_000,
    explain: {
      summary: 'register_chrdev → file_operations.read/write → userspace IO.',
      syscalls: ['open', 'read', 'write', 'close'],
      concepts: ['Character device', 'cdev', 'major/minor', 'mknod'],
    },
  },
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function ensureBuilt(targets) {
  if (!targets || targets.length === 0) return { ok: true };
  const missing = targets.filter(t => !fs.existsSync(path.join(DEMOS_DIR, t)));
  if (missing.length === 0) return { ok: true };

  // Build via make in DEMOS_DIR
  const r = spawnSync('make', ['-C', DEMOS_DIR], { encoding: 'utf-8' });
  if (r.status !== 0) {
    return { ok: false, error: `make failed:\n${r.stderr || r.stdout}` };
  }
  return { ok: true, built: missing };
}

function isWindowsHost() {
  return process.platform === 'win32';
}

// HTTP variant — gom output, trả 1 lần.
async function runScenarioBuffered(id) {
  const s = SCENARIOS[id];
  if (!s) return { error: 'unknown scenario' };
  if (isWindowsHost()) {
    return { error: 'Demo scenarios require Linux. Current host is win32.' };
  }

  const built = ensureBuilt(s.needsBuild);
  if (!built.ok) return { error: built.error };

  if (s.custom) {
    return await runCustomBuffered(s.custom, s);
  }

  const argv = s.cmd();
  return new Promise(resolve => {
    const child = spawn(argv[0], argv.slice(1), { cwd: s.cwd || REPO_ROOT });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    const t = setTimeout(() => child.kill('SIGTERM'), s.timeout || 10000);
    child.on('close', code => {
      clearTimeout(t);
      resolve({ id, code, stdout: out, stderr: err, explain: s.explain });
    });
    child.on('error', e => {
      clearTimeout(t);
      resolve({ id, code: -1, stdout: out, stderr: err + '\n' + e.message, explain: s.explain });
    });
  });
}

// Custom flows (buffered)
async function runCustomBuffered(name, s) {
  switch (name) {
    case 'tcpRoundTrip': {
      const port = 9000 + Math.floor(Math.random() * 999);
      const srv = spawn('./tcp_echo_server', [String(port)], { cwd: DEMOS_DIR });
      let log = `[spawn] tcp_echo_server :${port}\n`;
      srv.stdout.on('data', d => log += d.toString());
      srv.stderr.on('data', d => log += d.toString());

      await new Promise(r => setTimeout(r, 250));
      const cli = spawn('./tcp_echo_client', ['127.0.0.1', String(port), 'hello-dash'], { cwd: DEMOS_DIR });
      let cliOut = '';
      cli.stdout.on('data', d => cliOut += d);
      cli.stderr.on('data', d => cliOut += d);

      const cliCode = await new Promise(r => cli.on('close', r));
      log += `[client exit=${cliCode}]\n${cliOut}`;
      try { srv.kill('SIGTERM'); } catch (_) {}
      return { id: 'net-tcp-roundtrip', code: cliCode, stdout: log, explain: s.explain };
    }

    case 'loadHello': {
      const ko = path.join(KSAMPLES, 'hello_module.ko');
      if (!fs.existsSync(ko)) {
        const m = spawnSync('make', ['-C', KSAMPLES, 'hello'], { encoding: 'utf-8' });
        if (m.status !== 0) return { error: `kernel build failed:\n${m.stderr || m.stdout}` };
      }
      let out = '';
      const ins = spawnSync('sudo', ['-n', 'insmod', ko], { encoding: 'utf-8' });
      out += `$ sudo insmod ${ko}\n${ins.stderr || ''}${ins.stdout || ''}\n`;
      const dmesg = spawnSync('bash', ['-c', 'dmesg | tail -n 5'], { encoding: 'utf-8' });
      out += `$ dmesg | tail -n 5\n${dmesg.stdout}`;
      const rm = spawnSync('sudo', ['-n', 'rmmod', 'hello_module'], { encoding: 'utf-8' });
      out += `$ sudo rmmod hello_module\n${rm.stderr || rm.stdout || '(unloaded)'}\n`;
      return { id: 'kernel-load-hello', code: ins.status, stdout: out, explain: s.explain };
    }

    case 'procRW': {
      const ko = path.join(KSAMPLES, 'proc_module.ko');
      if (!fs.existsSync(ko)) {
        const m = spawnSync('make', ['-C', KSAMPLES, 'proc'], { encoding: 'utf-8' });
        if (m.status !== 0) return { error: `build failed:\n${m.stderr || m.stdout}` };
      }
      let out = '';
      out += run(['sudo', '-n', 'insmod', ko]);
      out += run(['bash', '-c', 'echo "from-dashboard-$(date +%s)" | sudo -n tee /proc/dashboard']);
      out += run(['cat', '/proc/dashboard']);
      out += run(['sudo', '-n', 'rmmod', 'proc_module']);
      return { id: 'kernel-proc-readwrite', code: 0, stdout: out, explain: s.explain };
    }

    case 'chardevRT': {
      const ko = path.join(KSAMPLES, 'chardev_module.ko');
      if (!fs.existsSync(ko)) {
        const m = spawnSync('make', ['-C', KSAMPLES, 'chardev'], { encoding: 'utf-8' });
        if (m.status !== 0) return { error: `build failed:\n${m.stderr || m.stdout}` };
      }
      let out = '';
      out += run(['sudo', '-n', 'insmod', ko]);
      out += run(['bash', '-c', 'sudo -n chmod 666 /dev/dashboard 2>/dev/null; echo "hello-chardev" > /dev/dashboard']);
      out += run(['cat', '/dev/dashboard']);
      out += run(['sudo', '-n', 'rmmod', 'chardev_module']);
      return { id: 'kernel-chardev-roundtrip', code: 0, stdout: out, explain: s.explain };
    }

    default:
      return { error: 'unknown custom flow' };
  }
}

function run(argv) {
  const r = spawnSync(argv[0], argv.slice(1), { encoding: 'utf-8' });
  return `$ ${argv.join(' ')}\n${r.stdout || ''}${r.stderr || ''}\n`;
}

// ──────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────
router.get('/scenarios', (req, res) => {
  const list = Object.entries(SCENARIOS).map(([id, s]) => ({
    id,
    title: s.title,
    category: s.category,
    explain: s.explain,
  }));
  res.json({ scenarios: list, host: process.platform });
});

router.post('/run', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  logger.info(`[demo] run ${id}`);
  const out = await runScenarioBuffered(id);
  res.json(out);
});

// Streaming via Socket.IO — registered in socketManager
function attachDemoSocket(socket) {
  socket.on('demo:run', async ({ id, sid }) => {
    const s = SCENARIOS[id];
    const channel = (type, payload) =>
      socket.emit('demo:' + type, { sid, id, ...payload });
    if (!s) return channel('done', { error: 'unknown scenario' });

    if (process.platform === 'win32') {
      channel('line', { line: '[error] Demo scenarios require Linux host', level: 'error' });
      return channel('done', { error: 'win32 host' });
    }

    // build if needed (sync, but stream feedback)
    const built = ensureBuilt(s.needsBuild);
    if (!built.ok) {
      channel('line', { line: built.error, level: 'error' });
      return channel('done', { error: built.error });
    }
    if (built.built && built.built.length) {
      channel('line', { line: `[make] built: ${built.built.join(', ')}`, level: 'info' });
    }

    // For custom flows, fall back to buffered mode and stream as one block.
    if (s.custom) {
      const r = await runCustomBuffered(s.custom, s);
      r.stdout?.split('\n').forEach(line => channel('line', { line, level: 'info' }));
      if (r.stderr) channel('line', { line: r.stderr, level: 'error' });
      return channel('done', { code: r.code ?? 0, explain: s.explain });
    }

    // Plain command: stream live
    const argv = s.cmd();
    channel('line', { line: `$ ${argv.join(' ')}`, level: 'info' });
    activity.log({ scope: 'demo', command: argv.join(' '), code: null, level: 'info', output: '[start]', meta: { scenario: id } });
    const child = spawn(argv[0], argv.slice(1), { cwd: s.cwd || REPO_ROOT });
    const t = setTimeout(() => { try { child.kill('SIGTERM'); } catch (_) {} }, s.timeout || 10000);

    let bufLog = '';
    const stream = (level) => (d) =>
      d.toString().split('\n').forEach(line => {
        if (line.length) {
          bufLog += line + '\n';
          channel('line', { line, level });
        }
      });
    child.stdout.on('data', stream('info'));
    child.stderr.on('data', stream('warn'));

    child.on('close', code => {
      clearTimeout(t);
      activity.log({ scope: 'demo', command: argv.join(' '), code, output: bufLog.slice(-800), meta: { scenario: id } });
      channel('done', { code, explain: s.explain });
    });
    child.on('error', e => {
      clearTimeout(t);
      activity.log({ scope: 'demo', command: argv.join(' '), code: -1, level: 'error', output: e.message, meta: { scenario: id } });
      channel('line', { line: `[error] ${e.message}`, level: 'error' });
      channel('done', { code: -1, error: e.message });
    });

    socket.once('demo:cancel', () => { try { child.kill('SIGTERM'); } catch (_) {} });
  });
}

module.exports = router;
module.exports.attachDemoSocket = attachDemoSocket;
module.exports.SCENARIOS = SCENARIOS;
