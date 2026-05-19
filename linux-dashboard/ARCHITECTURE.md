# Linux Programming Dashboard — Kiến trúc tổng thể

> Tài liệu kiến trúc cho đồ án môn **Lập trình nhân Linux**.
> Đối tượng: hội đồng chấm + người tiếp nhận source.
> Ngôn ngữ: tiếng Việt (code và comment giữ tiếng Anh).

---

## 1. Mục tiêu

Xây dựng một **Linux DevOps + Kernel Programming Control Center** chạy thật trên Ubuntu / WSL2 / VM Linux. Hệ thống minh hoạ trực quan **3 nhóm bài toán** của môn học:

1. **Shell programming** — file management, cron, package, system time.
2. **Process / Network / IPC** — process tree, fork/zombie/orphan, socket TCP/UDP/UDS, strace.
3. **Linux Kernel Module** — viết, build, load/unload, /proc, /sys, character device, netfilter hook, syscall tracepoint.

Toàn bộ thao tác được thực thi bằng **command thật** (bash, gcc, make, insmod, dmesg, ss, strace, ...). Không có dữ liệu giả.

## 2. Sơ đồ kiến trúc tổng

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                  React + Vite + Tailwind UI                        │    │
│  │   Sidebar  →  Shell  │  Process  │  Kernel  │  Demo                │    │
│  │   xterm.js (real terminal) | recharts | monaco editor | framer     │    │
│  └─────────────┬──────────────────────────────┬───────────────────────┘    │
│                │  HTTP /api/...               │  Socket.IO (ws)            │
└────────────────┼──────────────────────────────┼────────────────────────────┘
                 │                              │
┌────────────────┼──────────────────────────────┼────────────────────────────┐
│                ▼                              ▼              BACKEND       │
│        Express REST                    Socket.IO server                    │
│   ┌─────────────────────────┐    ┌──────────────────────────┐              │
│   │  routes/shell.js        │    │  socketManager.js        │              │
│   │  routes/process.js      │    │  • terminal:execute      │              │
│   │  routes/kernel.js       │    │  • kernel:compile        │              │
│   │  routes/demo.js         │    │  • kernel:dmesg:watch    │              │
│   │  routes/strace.js       │    │  • demo:run / cancel     │              │
│   └─────────┬───────────────┘    │  • strace:start / cancel │              │
│             │                    │  • metrics:start         │              │
│             ▼                    └──────────┬───────────────┘              │
│       child_process.spawn() — chạy thật command Linux                      │
└────────────────┬─────────────────────────────┬─────────────────────────────┘
                 │                             │
                 ▼                             ▼
            ┌────────────────────────────────────────────┐
            │                LINUX SYSTEM                │
            │  bash, ps, lsmod, insmod, dmesg, ss, dig,  │
            │  strace, make, gcc, crontab, apt, chmod    │
            │  /proc, /sys, /dev, syslog, journald       │
            │            ↓ ↑                             │
            │     Linux Kernel  (LKMs nạp tại runtime)   │
            └────────────────────────────────────────────┘
```

## 3. Cấu trúc thư mục

```
linux-dashboard/
├── ARCHITECTURE.md          ← tài liệu này
├── UBUNTU_SETUP.md          ← hướng dẫn dựng môi trường
├── SECURITY.md              ← rủi ro & cách giảm thiểu
├── PRESENTATION_FLOW.md     ← script demo / chấm điểm
├── docker-compose.yml
├── start.sh
│
├── backend/
│   └── src/
│       ├── index.js                  ← Express + Socket.IO bootstrap
│       ├── socket/socketManager.js   ← terminal stream, dmesg watch, kernel build
│       ├── routes/
│       │   ├── shell.js              ← files, cron, packages, time
│       │   ├── process.js            ← ps, kill, top, ss, ping, …
│       │   ├── kernel.js             ← lsmod, modinfo, insmod/rmmod, build .ko
│       │   ├── demo.js               ← scenario runner (HTTP + WS)
│       │   └── strace.js             ← strace -c & live -f -tt
│       └── utils/
│           ├── logger.js             ← winston file + console
│           └── commandValidator.js   ← blacklist + injection check
│
├── frontend/
│   └── src/
│       ├── App.jsx · main.jsx · index.css
│       ├── pages/   { Shell, Process, Kernel, Demo, Login }
│       ├── components/
│       │   ├── Layout/    { Sidebar, Header }
│       │   ├── Terminal/  { TerminalPanel.jsx (xterm.js) }
│       │   ├── Shell/     { FileManager, CronManager, PackageManager,
│       │   │              SystemTime, AutomationHub }
│       │   ├── Process/   { ProcessManager, ResourceMonitor,
│       │   │              SocketMonitor, NetworkTools, SystemLogs,
│       │   │              StraceTracer }
│       │   ├── Kernel/    { ModuleManager, ModuleBuilder, KernelBuilder,
│       │   │              KernelLogs }
│       │   ├── Explain/   { ExplainPanel.jsx, ArchitectureFlow.jsx }
│       │   └── UI/        { Tabs.jsx }
│       ├── data/linuxConcepts.js     ← knowledge base cho Explain system
│       ├── store/         { socketStore, authStore, themeStore }
│       └── utils/api.js              ← axios client
│
└── kernel-samples/                   ← Linux Kernel Modules (.c + Makefile)
    ├── Makefile                      ← build TẤT CẢ với 1 lệnh `make`
    ├── hello_module.c                ← module init/exit, printk, params
    ├── proc_module.c                 ← /proc/dashboard với seq_file + write
    ├── chardev_module.c              ← character device /dev/dashboard
    ├── timer_module.c                ← timer + workqueue
    ├── process_monitor.c             ← for_each_process → /proc/dashboard_procs
    ├── memory_monitor.c              ← si_meminfo → /proc/dashboard_mem
    ├── sysfs_module.c                ← /sys/kernel/dashboard/{counter,message}
    ├── netfilter_logger.c            ← NF_INET_PRE_ROUTING packet logger
    ├── syscall_count.c               ← tracepoint sys_enter counter
    │
    └── userspace-demos/               ← Userspace C demos
        ├── Makefile
        ├── fork_demo.c                ← fork() + exec() + wait()
        ├── zombie_demo.c              ← tạo zombie có chủ ý
        ├── orphan_demo.c              ← reparent về init
        ├── uds_demo.c                 ← socketpair AF_UNIX IPC
        ├── tcp_echo_server.c          ← TCP server (select-based)
        └── tcp_echo_client.c          ← TCP client
```

## 4. Module 1 — Shell & Automation

### Frontend

* `pages/Shell.jsx` chia 6 tab: Automation, Terminal, Files, Packages, Cron, System Time.
* `TerminalPanel.jsx` dùng **xterm.js** — emit `terminal:execute` qua Socket.IO, render stdout/stderr realtime.

### Backend (`routes/shell.js`)

| Endpoint | Bash equivalent | Ghi chú |
|---|---|---|
| `GET /api/shell/files/list?dir=` | `ls -la` (qua `fs.readdir` + `fs.stat`) | Trả `permissions` octal, mtime, size. |
| `POST /api/shell/files/{create,write,delete,rename,mkdir,upload}` | `touch / rm / mv / mkdir / cp` | Có chặn `..` để tránh path traversal. |
| `POST /api/shell/files/chmod` | `chmod <mode> <file>` | Spawn `chmod` thật. |
| `GET /api/shell/cron/list` / `POST /add` / `POST /remove` | `crontab -l / -e` | Edit crontab user hiện tại. |
| `GET /api/shell/packages/list` / `search` / `POST install` / `remove` | `dpkg -l`, `apt search/install/remove` | Stream qua socket `packages:install`. |
| `GET/POST /api/shell/time/*` | `timedatectl` | Đọc/đổi timezone, NTP. |

### Realtime flow (terminal)

```
xterm.onData(c) → socket.emit('terminal:execute', { command })
                                                          │
                  ┌───────────────────────────────────────┘
                  ▼
        spawn('bash', ['-c', command])
                  │ stdout / stderr
                  ▼
        socket.emit('terminal:output' | 'terminal:error')
                  │
                  ▼
        xterm.write(data)   (line replace \n → \r\n)
```

## 5. Module 2 — Process / Network / IPC / Strace

### Frontend tabs

`Processes`, `Resources`, `Sockets`, `Net Tools`, **`Strace`** (mới), `Sys Logs`.

### Backend (`routes/process.js` + `strace.js`)

| Endpoint | Command | Mô tả |
|---|---|---|
| `GET  /api/process/list`     | `ps aux`               | Parse cột → JSON. |
| `GET  /api/process/tree`     | `pstree -p`            |  |
| `GET  /api/process/info/:pid`| `cat /proc/<pid>/status` | Đọc trực tiếp /proc. |
| `POST /api/process/kill`     | `kill -SIG <pid>`      | `process.kill()` của Node. |
| `GET  /api/process/resources`| `os.cpus()/totalmem`   | Raw OS stats. |
| `GET  /api/process/network/{interfaces,connections,ports,stats,ifconfig}` | `ip`, `ss -tulpn`, `ifconfig`, `ss -s` |  |
| `POST /api/process/network/{ping,traceroute,dns}` | `ping`, `traceroute`, `dig` |  |
| `GET  /api/strace/check`     | `strace -V`            | Kiểm tra cài đặt. |
| `POST /api/strace/summary`   | `strace -c -f -- bash -c "<cmd>"` | Trả bảng thống kê syscall. |
| socket `strace:start`        | `strace -f -tt -T --`  | Stream syscall realtime. |

### Userspace demo C

Build & chạy bằng `make` trong `kernel-samples/userspace-demos/`. Backend `demo.js` tự build khi cần.

* `fork_demo` — `fork() + execvp("/bin/echo") + waitpid()`.
* `zombie_demo` — child exit, parent ngủ N giây → state `Z` (defunct).
* `orphan_demo` — parent exit trước → child reparent về PID 1.
* `uds_demo` — `socketpair(AF_UNIX, SOCK_STREAM)` IPC parent ↔ child.
* `tcp_echo_server` / `tcp_echo_client` — full TCP socket lifecycle.

## 6. Module 3 — Linux Kernel Module

### 9 module thật trong `kernel-samples/`

| File | Concept | Verify |
|---|---|---|
| `hello_module.c`        | module_init/exit, printk, MODULE_PARM | `dmesg \| tail` |
| `proc_module.c`         | /proc, seq_file, copy_from_user | `cat /proc/dashboard` |
| `chardev_module.c`      | cdev, file_operations, ring buffer | `echo hi > /dev/dashboard && cat /dev/dashboard` |
| `timer_module.c`        | timer_list, workqueue, jiffies | `dmesg -w \| grep timer_module` |
| `process_monitor.c`     | for_each_process, task_struct | `cat /proc/dashboard_procs` |
| `memory_monitor.c`      | si_meminfo, struct sysinfo, vmstat | `cat /proc/dashboard_mem` |
| `sysfs_module.c`        | kobject, sysfs_create_file | `cat/echo /sys/kernel/dashboard/counter` |
| `netfilter_logger.c`    | NF_INET_PRE_ROUTING hook | `dmesg -w \| grep nf_logger` (chỉ log, không drop) |
| `syscall_count.c`       | tracepoint sys_enter | `cat /proc/dashboard_syscalls` |

Tất cả build chung qua `kernel-samples/Makefile` với `make`. Mỗi module có target `make load-<name>` / `make unload-<name>`.

### Build pipeline (custom module qua dashboard)

```
User dán code C trong KernelBuilder.jsx
     │
     ▼
socket.emit('kernel:compile', { code, moduleName, autoLoad })
     │
     ▼  (socketManager.js)
fs.writeFile  backend/kernel-modules/<name>/<name>.c
fs.writeFile  backend/kernel-modules/<name>/Makefile
     │
     ▼
spawn('make', [], { cwd: moduleDir })   ← stream stdout/stderr line-by-line
     │ (success)
     ▼
spawn('sudo', ['insmod', '<name>.ko'])   ← nếu autoLoad
     │
     ▼  emit 'kernel:compile:log' realtime
xterm-style log panel hiển thị từng dòng
```

`Makefile` dùng `M=$(CURDIR)` + spawn với `cwd: moduleDir` → CURDIR luôn đúng kể cả gọi từ Node ở thư mục khác.

### Kernel log streaming

```
socket.emit('kernel:dmesg:watch')
     │
     ▼  socketManager.js
Test  dmesg -n 1  (no sudo)  → ok? dùng dmesg -w --color=never
                              │ no?  fallback sudo -n dmesg -w --color=never
     │ stdout
     ▼
emit('kernel:dmesg:line', { line })  cho từng newline
     │
     ▼ KernelLogs.jsx
filter + colorize theo "error|warn|info|loaded|success"
```

## 7. Demo Scenarios system

Trang `/demo` (mới). Backend `routes/demo.js` định nghĩa **catalog 8 scenarios**, mỗi cái:

```js
{
  title, category,
  needsBuild: ['fork_demo'],     // tự gọi make trước khi run
  cmd: () => ['./fork_demo','3'],
  cwd: DEMOS_DIR, timeout,
  explain: { summary, syscalls, concepts, verify, flow }
}
```

8 scenario hiện có:

1. **process-fork** — fork+exec+wait demo (3 child).
2. **process-zombie** — tạo zombie 6 giây.
3. **process-orphan** — orphan reparent về init.
4. **ipc-uds** — UNIX domain socket pair.
5. **net-tcp-roundtrip** — server+client echo.
6. **kernel-load-hello** — insmod hello → dmesg → rmmod.
7. **kernel-proc-readwrite** — proc_module write/read /proc/dashboard.
8. **kernel-chardev-roundtrip** — chardev_module echo > /dev/dashboard && cat.

Output thực được stream realtime qua socket `demo:line / demo:done`. Đi kèm là `<ExplainCard/>` (Linux concept) và `<ArchitectureFlow/>` (sơ đồ luồng tương ứng category).

## 8. Explainability System

### `frontend/src/data/linuxConcepts.js`

Knowledge base 2 phần:

* `CONCEPTS` — `{ chmod, chown, cron, apt, fork, zombie, orphan, socket, ping, insmod, rmmod, printk, procfs, sysfs, chardev, netfilter, tracepoint }` — mỗi entry có `summary, command, breakdown, syscalls, concepts, flow, risks, verify`.
* `SYSCALLS` — signature + 1 dòng giải thích cho `fork, execve, wait, waitpid, exit, open, read, write, close, socket, bind, listen, accept, connect, socketpair, init_module, delete_module`.

### `<ExplainPanel concept="chmod" label="chmod" />`

Button + Modal hiển thị: summary → command → breakdown → syscalls → concepts → kernel flow → verify → risks.

Đã chèn vào: `FileManager` (chmod), `ProcessManager` (fork, zombie), `ModuleManager` (insmod, rmmod, printk), `CronManager` (cron), `StraceTracer`, `Demo`.

### `<ArchitectureFlow scenario="..." />`

Vẽ 4 luồng: `syscall`, `module`, `socket`, `procfs`. Mỗi node hiển thị `layer + icon + label`, có chevron giữa các tầng.

## 9. WebSocket event reference

| Channel             | Direction | Payload | Mô tả |
|---|---|---|---|
| `terminal:execute`  | C→S       | `{ command, id }` | Spawn `bash -c`, stream output. |
| `terminal:output`   | S→C       | `{ id, data }` | stdout. |
| `terminal:error`    | S→C       | `{ id, error }` | stderr. |
| `terminal:close`    | S→C       | `{ id, code }` | exit code. |
| `kernel:compile`    | C→S       | `{ code, moduleName, autoLoad }` | Build .ko. |
| `kernel:compile:log`| S→C       | `{ line, level }` | line-by-line make output. |
| `kernel:compile:done`| S→C      | `{ success, koFile, loaded }` | |
| `kernel:dmesg:watch` / `:stop` | C→S |  | Spawn `dmesg -w`. |
| `kernel:dmesg:line` | S→C       | `{ line }` |  |
| `metrics:start` / `:stop` | C→S |  | spawn `top -b -n 1` mỗi 2s. |
| `metrics:update`    | S→C       | `{ data }` |  |
| `files:watch` / `:unwatch` | C→S | `{ path }` | inotifywait. |
| `files:change`      | S→C       | `{ path, event }` |  |
| `packages:install` / `remove` | C→S | `{ name, id }` | apt-get streaming. |
| `packages:output` / `:close` | S→C | | |
| `demo:run` / `demo:cancel` | C→S | `{ id, sid }` | Run scenario. |
| `demo:line` / `demo:done`  | S→C | `{ sid, line, level }` / `{ code, explain }` | |
| `strace:start` / `:cancel` | C→S | `{ command, sid }` | |
| `strace:line` / `:done`    | S→C | | |

## 10. Logging chain

```
operation in handler
   ├─ winston logger (file + stdout)             (backend)
   ├─ Socket.IO event → frontend log views        (live stream)
   ├─ kernel side:  printk → /dev/kmsg → dmesg    (kernel modules)
   └─ syslog: journalctl, /var/log/syslog/auth.log (HTTP /api/process/logs/*)
```

## 11. Tham chiếu nhanh

* Setup môi trường: xem `UBUNTU_SETUP.md`.
* Rủi ro bảo mật: xem `SECURITY.md`.
* Kịch bản thuyết trình: xem `PRESENTATION_FLOW.md`.
* API endpoints chi tiết: xem `API_REFERENCE.md`.
