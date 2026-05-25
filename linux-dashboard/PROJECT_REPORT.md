# BÁO CÁO ĐỒ ÁN: LINUX DASHBOARD

## Hệ thống quản trị Linux toàn diện qua giao diện Web

> **Môn học**: Lập trình Nhân Linux  
> **Phiên bản**: 2.0  
> **Ngôn ngữ chính**: JavaScript (Node.js + React), C (Kernel modules), Bash, Python

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Cấu trúc thư mục](#4-cấu-trúc-thư-mục)
5. [Module 1: Shell & Automation](#5-module-1-shell--automation)
6. [Module 2: Process & Network Management](#6-module-2-process--network-management)
7. [Module 3: Kernel Module Center](#7-module-3-kernel-module-center)
8. [Cơ chế truyền lệnh Backend ↔ Frontend](#8-cơ-chế-truyền-lệnh-backend--frontend)
9. [Bảo mật & Cấu hình quyền](#9-bảo-mật--cấu-hình-quyền)
10. [Hướng dẫn cài đặt và chạy](#10-hướng-dẫn-cài-đặt-và-chạy)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mục tiêu

Xây dựng một **dashboard web fullstack** đáp ứng đầy đủ 3 nhóm yêu cầu của môn Lập trình Nhân Linux:

1. **Lập trình Shell**: Quản lý file, lập lịch tác vụ (cron), thiết lập thời gian hệ thống, cài đặt/gỡ bỏ chương trình tự động.
2. **Lập trình quản lý hệ thống**: Quản lý tiến trình, file, socket và network trong Ubuntu.
3. **Lập trình Kernel**: Xây dựng mô-đun nhân và tích hợp vào hệ thống.

### 1.2. Đặc điểm nổi bật

- **Real-time streaming**: Mọi thao tác đều phản hồi tức thì qua WebSocket (Socket.IO).
- **Build & load kernel module trực tiếp**: Compile file `.c` → `.ko` → `insmod` ngay trên trình duyệt.
- **Hiển thị mapping device/proc**: Tự động đọc `/proc/devices`, `/proc/modules`, `/dev/*` sau khi insmod.
- **Script templates**: Có sẵn 6 template Bash + Python cho cron jobs.
- **Light & Dark mode**: Hai theme với CSS variables.
- **Activity logging**: Mọi command được log realtime, broadcast qua socket cho UI.

### 1.3. Phạm vi

| Tính năng | Trạng thái |
|---|---|
| File Manager (CRUD, chmod, search) | ✅ |
| Cron Manager với script editor | ✅ |
| Package Manager (apt) streaming | ✅ |
| System Time & Timezone | ✅ |
| Process Manager + Signal | ✅ |
| Resource Monitor (CPU/RAM/Disk) | ✅ |
| Network Tools (ping/dns/traceroute) | ✅ |
| Socket Monitor (TCP/UDP) | ✅ |
| System Logs (journalctl/auth/kernel) | ✅ |
| Strace System Call Tracer | ✅ |
| Kernel Module Builder (write & compile) | ✅ |
| Module Manager (lsmod/insmod/rmmod) | ✅ |
| Live dmesg streaming | ✅ |
| Major ID & Device mapping | ✅ |
| Demo scenarios (fork, zombie, TCP) | ✅ |

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Sơ đồ tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (User)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React SPA (Vite + Tailwind + Framer Motion)        │    │
│  │  • Pages: Shell / Process / Kernel                  │    │
│  │  • Stores: socketStore, themeStore                  │    │
│  │  • Components: 25+ UI components                    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       HTTP REST API                   WebSocket (Socket.IO)
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Express Routes (HTTP REST)                         │    │
│  │  /api/shell  /api/process  /api/kernel              │    │
│  │  /api/demo   /api/strace                            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Socket.IO Manager (Streaming)                      │    │
│  │  terminal:*  kernel:compile  dmesg:watch  metrics   │    │
│  │  packages:*  files:watch     activity:log           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Activity Bus (broadcast)                           │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────┬─────────────────────────────────────────────┘
               │
       child_process.spawn() / fs.* / sudo
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  UBUNTU LINUX (System Layer)                │
│  Shell      • bash, ps, ss, dig, ping, ifconfig            │
│  Files      • ls, find, cat, chmod, tar                     │
│  System     • crontab, timedatectl, systemctl, dpkg, apt    │
│  Kernel     • make, gcc, insmod, rmmod, lsmod, dmesg        │
│  Tracing    • strace, inotifywait                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Luồng dữ liệu (Data flow)

**Ví dụ: User insmod một module**

```
[Browser]                [Backend]               [Ubuntu Kernel]
   │                        │                          │
   │ 1. POST /api/kernel/   │                          │
   │    insmod {koFile}     │                          │
   ├───────────────────────►│                          │
   │                        │ 2. spawn('sudo',         │
   │                        │    ['insmod', koFile])   │
   │                        ├─────────────────────────►│
   │                        │                          │ 3. Module
   │                        │                          │    loaded
   │                        │ 4. exit code 0           │
   │                        │◄─────────────────────────┤
   │ 5. {message: ok}       │                          │
   │◄───────────────────────┤                          │
   │                        │                          │
   │ 6. GET /api/kernel/    │                          │
   │    proc-devices        │                          │
   ├───────────────────────►│                          │
   │                        │ 7. fs.readFile(          │
   │                        │    '/proc/devices')      │
   │                        ├─────────────────────────►│
   │                        │ 8. content               │
   │                        │◄─────────────────────────┤
   │ 9. {charDevices,       │                          │
   │     blockDevices}      │                          │
   │◄───────────────────────┤                          │
```

---

## 3. CÔNG NGHỆ SỬ DỤNG

### 3.1. Backend (Node.js)

| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| **Express** | 4.18 | HTTP server, routing |
| **Socket.IO** | 4.7 | Bidirectional real-time stream |
| **Multer** | 1.4 | Upload file (kernel modules, scripts) |
| **Helmet** | 7.1 | Bảo mật HTTP headers |
| **Morgan** | 1.10 | HTTP request logging |
| **Winston** | 3.11 | Application logging |
| **dotenv** | 16.3 | Cấu hình môi trường |
| **child_process** (built-in) | - | Thực thi shell command (`spawn`) |
| **fs** (built-in) | - | Read/write file system |

### 3.2. Frontend (React 18)

| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| **React** | 18.2 | UI library |
| **Vite** | 5.0 | Build tool & dev server |
| **React Router** | 6.20 | Client-side routing |
| **Zustand** | 4.4 | State management |
| **Socket.IO Client** | 4.7 | WebSocket client |
| **Axios** | 1.6 | HTTP client |
| **Framer Motion** | 10.16 | Animation |
| **Tailwind CSS** | 3.3 | Utility-first CSS |
| **Lucide React** | 0.292 | Icon set |
| **Recharts** | 2.10 | Biểu đồ (CPU/RAM) |
| **Xterm.js** | 5.3 | Terminal emulator |
| **Monaco Editor** | 0.44 | Code editor (Kernel C) |

### 3.3. Hệ thống Linux

- **Ubuntu** 20.04+ (hoặc tương đương)
- **Kernel headers**: `linux-headers-$(uname -r)`
- **Build tools**: `gcc`, `make`, `build-essential`
- **System tools**: `crontab`, `systemctl`, `apt`, `dpkg`, `dmesg`, `lsmod`, `insmod`, `rmmod`, `strace`, `ss`, `dig`, `ping`, `traceroute`, `inotifywait`

---

## 4. CẤU TRÚC THƯ MỤC

```
linux-dashboard/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Entry point: Express + Socket.IO
│   │   ├── routes/
│   │   │   ├── shell.js              # File, Cron, Package, Time
│   │   │   ├── process.js            # Process, Resource, Network, Logs
│   │   │   ├── kernel.js             # Modules, Build, /proc/devices
│   │   │   ├── strace.js             # System call tracing
│   │   │   └── demo.js               # Educational demos (fork, zombie)
│   │   ├── socket/
│   │   │   └── socketManager.js      # WebSocket event handlers
│   │   ├── middleware/
│   │   │   └── auth.js               # (optional) auth middleware
│   │   └── utils/
│   │       ├── logger.js             # Winston logger
│   │       ├── activity.js           # Activity broadcast bus
│   │       └── commandValidator.js   # Command whitelist/blacklist
│   ├── kernel-modules/               # Compiled .ko files
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                   # Router root
│   │   ├── index.css                 # Theme variables (light/dark)
│   │   ├── pages/
│   │   │   ├── Shell.jsx             # Shell module (6 tabs)
│   │   │   ├── Process.jsx           # Process module (6 tabs)
│   │   │   └── Kernel.jsx            # Kernel module (3 tabs)
│   │   ├── components/
│   │   │   ├── Layout/               # Sidebar, Header
│   │   │   ├── Shell/                # FileManager, CronManager, ...
│   │   │   ├── Process/              # ProcessManager, NetworkTools, ...
│   │   │   ├── Kernel/               # KernelBuilder, ModuleManager, ...
│   │   │   ├── Terminal/             # TerminalPanel (xterm)
│   │   │   ├── ActivityLog/          # Realtime command log
│   │   │   ├── Explain/              # Concept explanation panels
│   │   │   └── UI/                   # Tabs, Portal
│   │   ├── store/
│   │   │   ├── socketStore.js        # Socket.IO connection (Zustand)
│   │   │   └── themeStore.js         # Light/Dark theme
│   │   ├── data/
│   │   │   └── linuxConcepts.js      # Concept dictionary
│   │   └── utils/
│   │       └── api.js                # Axios instance
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── kernel-samples/                   # Sample C kernel modules
│   ├── hello_module.c                # Basic init/exit/printk
│   ├── chardev_module.c              # Character device + major ID
│   ├── proc_module.c                 # /proc filesystem entry
│   ├── sysfs_module.c                # sysfs kobject
│   ├── timer_module.c                # Kernel timer
│   ├── process_monitor.c             # for_each_process iteration
│   ├── memory_monitor.c              # Memory statistics
│   ├── netfilter_logger.c            # Netfilter hook
│   ├── syscall_count.c               # Syscall counter
│   ├── Makefile
│   └── userspace-demos/              # Educational userspace C demos
│       ├── fork_demo.c
│       ├── zombie_demo.c
│       ├── orphan_demo.c
│       ├── tcp_echo_server.c
│       ├── tcp_echo_client.c
│       └── uds_demo.c
│
├── scripts/
│   ├── start.sh                      # Khởi động dev/prod/pm2
│   └── setup-sudoers.sh              # Cấu hình NOPASSWD sudo
│
├── docker-compose.yml
└── README.md
```


---

## 5. MODULE 1: SHELL & AUTOMATION

> **Yêu cầu**: Lập trình shell để quản lý file, lập lịch tác vụ, thiết lập thời gian hệ thống, cài đặt/gỡ bỏ chương trình tự động.

### 5.1. Sơ đồ tab

```
┌─ Shell & Automation ──────────────────────────────┐
│  [Automation] [Terminal] [Files] [Packages]       │
│  [Cron Jobs] [System Time]                        │
└───────────────────────────────────────────────────┘
```

### 5.2. Sub-module 1.1: File Manager

**Frontend**: `components/Shell/FileManager.jsx`  
**Backend**: `routes/shell.js` (prefix `/api/shell/files`)

#### Tính năng
- Liệt kê file/thư mục với phân loại (icon theo extension)
- Toggle list/grid view
- Breadcrumb navigation
- Tìm kiếm theo tên file
- Đổi tên (rename)
- Xóa file/thư mục với confirm
- Hiển thị permissions, size, modified time
- Tạo file/thư mục mới

#### API Endpoints

| Method | Endpoint | Mô tả | Backend command |
|---|---|---|---|
| GET | `/api/shell/files/list?dir=/home` | Liệt kê thư mục | `fs.readdir`, `fs.stat` |
| GET | `/api/shell/files/read?file=...` | Đọc nội dung file | `fs.readFile` |
| POST | `/api/shell/files/write` | Ghi file | `fs.writeFile` |
| POST | `/api/shell/files/create` | Tạo file mới | `fs.writeFile` |
| POST | `/api/shell/files/delete` | Xóa file | `fs.unlink` |
| POST | `/api/shell/files/rename` | Đổi tên | `fs.rename` |
| POST | `/api/shell/files/chmod` | Đổi quyền | `spawn('chmod', [mode, file])` |
| POST | `/api/shell/files/mkdir` | Tạo thư mục | `fs.mkdir` |
| POST | `/api/shell/files/upload` | Upload file | `multer` middleware |
| GET | `/api/shell/files/search?query=&dir=` | Tìm file | `spawn('find', ...)` |

#### Ví dụ command thực thi backend

```javascript
// File: backend/src/routes/shell.js
router.post('/files/chmod', (req, res) => {
  const { file, mode } = req.body;
  const chmod = spawn('chmod', [mode, file]);
  // ...
});
```

#### Bảo mật
- Chặn directory traversal: từ chối path chứa `..`
- Validate input qua middleware

---

### 5.3. Sub-module 1.2: Cron Manager (Lập lịch tác vụ)

**Frontend**: `components/Shell/CronManager.jsx`  
**Backend**: `routes/shell.js` (prefix `/api/shell/cron` và `/api/shell/scripts`)

#### Tính năng
- Liệt kê tất cả cron jobs hiện tại
- Tạo cron job mới với 3 chế độ:
  - **Single command**: 1 lệnh trên 1 dòng
  - **Bash script**: Multi-line shell script
  - **Python script**: Multi-line Python script
- 9 preset schedule: every minute/hour/6h/day/Sunday/...
- Human-readable schedule description (tự động giải thích cron expression)
- 6 script templates có sẵn:
  - 🗂️ Backup Files (tar.gz daily)
  - 🧹 Cleanup Logs (xóa log > 7 ngày)
  - 💊 System Health Check (CPU/RAM/Disk alert)
  - 🐍 Python Service Monitor (systemctl is-active)
  - 🌐 Network Watchdog (ping & DNS check)
  - 💾 Disk Space Alert (df threshold)
- Preview script trước khi áp dụng
- Xóa cron job theo ID

#### API Endpoints

| Method | Endpoint | Mô tả | Backend command |
|---|---|---|---|
| GET | `/api/shell/cron/list` | Liệt kê cron | `crontab -l` |
| POST | `/api/shell/cron/add` | Thêm cron | `crontab -l \| ... \| crontab -` |
| POST | `/api/shell/cron/remove` | Xóa cron | `crontab` rebuild |
| POST | `/api/shell/scripts/save` | Lưu script | `fs.writeFile` + `chmod 755` |

#### Cơ chế lưu script
1. User soạn script trong editor (Bash hoặc Python)
2. Frontend gọi `POST /api/shell/scripts/save`:
   ```json
   { "name": "cron_1700000000.sh", "content": "#!/bin/bash\n..." }
   ```
3. Backend lưu vào `~/.dashboard_scripts/cron_xxx.sh` với quyền `0755`
4. Backend trả về full path
5. Frontend gọi `POST /api/shell/cron/add` với command = `bash /home/user/.dashboard_scripts/cron_xxx.sh`
6. Crontab được cập nhật

#### Ví dụ tạo cron job

```bash
# Crontab line được generate:
0 2 * * * bash /home/codewalker/.dashboard_scripts/cron_1700000000.sh
```

---

### 5.4. Sub-module 1.3: Package Manager

**Frontend**: `components/Shell/PackageManager.jsx`  
**Backend**: `routes/shell.js` + `socket/socketManager.js`

#### Tính năng
- Liệt kê packages đã cài (`dpkg -l`)
- Tìm kiếm package (`apt search`)
- Cài đặt package với streaming output (Socket.IO)
- Gỡ bỏ package với streaming output
- Modal log realtime hiển thị tiến trình apt

#### API + Socket Events

| Type | Endpoint/Event | Mô tả |
|---|---|---|
| GET | `/api/shell/packages/list` | Liệt kê (dpkg -l) |
| GET | `/api/shell/packages/search?query=` | Search apt |
| Socket | `packages:install { name, id }` | Bắt đầu install |
| Socket | `packages:remove { name, id }` | Bắt đầu remove |
| Socket | `packages:output { id, data }` | Stream output |
| Socket | `packages:close { id, code }` | Hoàn tất |

#### Ví dụ luồng Install package

```javascript
// Backend (socketManager.js)
socket.on('packages:install', (data) => {
  const apt = spawn('sudo', ['-n', 'apt-get', 'install', '-y', data.name]);
  apt.stdout.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
  apt.stderr.on('data', (d) => socket.emit('packages:output', { id, data: d.toString() }));
  apt.on('close', (code) => socket.emit('packages:close', { id, code }));
});
```

```javascript
// Frontend
socket.emit('packages:install', { name: 'strace', id: 'inst_001' });
socket.on('packages:output', ({ data }) => appendLogToModal(data));
socket.on('packages:close', ({ code }) => setSuccess(code === 0));
```

---

### 5.5. Sub-module 1.4: System Time

**Frontend**: `components/Shell/SystemTime.jsx`  
**Backend**: `routes/shell.js` (prefix `/api/shell/time`)

#### Tính năng
- Đồng hồ realtime (cập nhật mỗi giây)
- Hiển thị Unix timestamp, ISO 8601, current timezone
- Đặt timezone (13 zone phổ biến)
- Đặt date/time hệ thống

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/shell/time/info` | `timedatectl` |
| POST | `/api/shell/time/set` | `timedatectl set-time <datetime>` |
| POST | `/api/shell/time/timezone` | `timedatectl set-timezone <tz>` |

---

### 5.6. Sub-module 1.5: Terminal & Automation Hub

**Frontend**: `components/Terminal/TerminalPanel.jsx`, `components/Shell/AutomationHub.jsx`  
**Backend**: `socket/socketManager.js` (`terminal:execute`)

- **Terminal**: Web terminal dùng xterm.js, gửi command qua socket → backend chạy `spawn('bash', ['-c', cmd])` → stream output về.
- **Automation Hub**: Các nút bấm tự động hóa (cleanup temp, system update, backup, ...).


---

## 6. MODULE 2: PROCESS & NETWORK MANAGEMENT

> **Yêu cầu**: Lập trình quản lý tiến trình, file, socket và network trong Ubuntu.

### 6.1. Sơ đồ tab

```
┌─ Process & Network ───────────────────────────────┐
│  [Processes] [Resources] [Sockets] [Net Tools]    │
│  [Strace] [Sys Logs]                              │
└───────────────────────────────────────────────────┘
```

### 6.2. Sub-module 2.1: Process Manager

**Frontend**: `components/Process/ProcessManager.jsx`  
**Backend**: `routes/process.js`

#### Tính năng
- Liệt kê tất cả tiến trình (`ps aux`)
- Sắp xếp theo CPU%, MEM%, PID
- Lọc theo user
- Tìm kiếm theo PID hoặc command
- Auto-refresh mỗi 2.5 giây (toggle Live/Paused)
- Modal chi tiết: đọc `/proc/<pid>/status`
- Gửi signal: SIGTERM, SIGKILL, SIGHUP, SIGINT, SIGSTOP, SIGCONT
- Color-coded CPU bar
- Status badge (R=running, S=sleeping, D=disk, Z=zombie, T=stopped)
- Modal qua React Portal (escape overflow clipping)

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/process/list` | `ps aux` |
| GET | `/api/process/info/:pid` | `cat /proc/<pid>/status` |
| GET | `/api/process/tree` | `pstree -p` |
| POST | `/api/process/kill` | `process.kill(pid, signal)` |
| POST | `/api/process/execute` | `bash -c <command>` |
| GET | `/api/process/top` | `top -b -n 1` |

#### Ví dụ output ps aux parsing

```javascript
// Backend parsing
const parts = line.split(/\s+/);
return {
  user: parts[0],
  pid: parts[1],
  cpu: parts[2],
  mem: parts[3],
  vsz: parts[4],
  rss: parts[5],
  tty: parts[6],
  stat: parts[7],
  start: parts[8],
  time: parts[9],
  command: parts.slice(10).join(' ')
};
```

---

### 6.3. Sub-module 2.2: Resource Monitor

**Frontend**: `components/Process/ResourceMonitor.jsx`  
**Backend**: `routes/process.js`

#### Tính năng
- 4 stat cards: CPU cores, Memory %, Uptime, Load average
- Biểu đồ Memory Usage % (Recharts AreaChart) - lịch sử 20 điểm
- Biểu đồ Load Average (Recharts LineChart)
- Disk usage bars (df -h) với color coding (green/yellow/red)
- Auto-refresh mỗi 2 giây

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/process/resources` | `os.cpus()`, `os.totalmem()`, ... |
| GET | `/api/process/disk` | `df -h` |

---

### 6.4. Sub-module 2.3: Socket Monitor

**Frontend**: `components/Process/SocketMonitor.jsx`  
**Backend**: `routes/process.js`

#### Tính năng
- Liệt kê tất cả TCP/UDP sockets (`ss -tuln`)
- Phát hiện port đáng ngờ: 22, 23, 3389, 4444, 5900, 6666, 31337
- Lọc: TCP/UDP, LISTEN, ESTAB, suspicious
- Stats: total, listening, established, suspicious
- Click để xem chi tiết (Portal modal)
- Kill process từ socket modal
- Auto-refresh 3s

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/process/network/connections` | `ss -tuln` |
| GET | `/api/process/network/ports` | `ss -tlnp` |
| GET | `/api/process/network/stats` | `ss -s` |

---

### 6.5. Sub-module 2.4: Network Tools

**Frontend**: `components/Process/NetworkTools.jsx`  
**Backend**: `routes/process.js`

#### Tính năng
- **Visual Ping**: Ping host, vẽ biểu đồ latency thời gian thực
- **Route Trace**: Traceroute đến đích, hiển thị hops
- **DNS Lookup**: Tra cứu DNS records (`dig`)
- **Interface Hub**: `ifconfig` / `ip addr` parse thành cards (IP, MAC, status UP/DOWN)
- History 10 lệnh gần nhất

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| POST | `/api/process/network/ping` | `ping -c 4 <host>` |
| POST | `/api/process/network/traceroute` | `traceroute -m 30 <host>` |
| POST | `/api/process/network/dns` | `dig <host>` |
| GET | `/api/process/network/ifconfig` | `ifconfig` (fallback `ip addr`) |
| GET | `/api/process/network/interfaces` | `ip link show` |

---

### 6.6. Sub-module 2.5: Strace Tracer

**Frontend**: `components/Process/StraceTracer.jsx`  
**Backend**: `routes/strace.js` + socket handler

#### Tính năng
- Trace syscall của 1 command bất kỳ với streaming output
- Chế độ summary: bảng count syscall + thời gian
- Trace process đang chạy theo PID
- Parse output thành table syscall với pct, calls, errors

#### API + Socket Events

| Type | Endpoint/Event | Backend command |
|---|---|---|
| GET | `/api/strace/check` | `strace -V` |
| POST | `/api/strace/summary` | `strace -c -f -- bash -c <cmd>` |
| POST | `/api/strace/trace` | `strace -p <pid> -c -S calls` |
| GET | `/api/strace/syscalls/:pid` | `strace -p <pid> -c -S calls` |
| Socket | `strace:start { command, sid }` | `strace -f -tt -T -s 120 -- bash -c <cmd>` (streaming) |
| Socket | `strace:line { sid, line, level }` | Stream từng dòng |
| Socket | `strace:done { sid, code }` | Hoàn tất |
| Socket | `strace:cancel` | Hủy trace |

---

### 6.7. Sub-module 2.6: System Logs

**Frontend**: `components/Process/SystemLogs.jsx`  
**Backend**: `routes/process.js`

#### Tính năng
- 3 log sources: Journal, Kernel, Auth
- Filter realtime, color-coded theo level (error/warn/info/debug)
- Stats: error count, warning count
- Auto-refresh mỗi 5 giây
- Download log file
- Auto-scroll to bottom

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/process/logs/journalctl?lines=100` | `journalctl -n 100 --no-pager` |
| GET | `/api/process/logs/kernel` | `dmesg \| tail -100` |
| GET | `/api/process/logs/auth` | `tail -n 100 /var/log/auth.log` |


---

## 7. MODULE 3: KERNEL MODULE CENTER

> **Yêu cầu**: Lập trình xây dựng 1 mô-đun nhân và tích hợp vào hệ thống.

### 7.1. Sơ đồ tab

```
┌─ Kernel Modules ──────────────────────────────────┐
│  [Modules] [Build & Run] [Kernel Logs]            │
└───────────────────────────────────────────────────┘
```

### 7.2. Sub-module 3.1: Module Builder (Build & Run)

**Frontend**: `components/Kernel/KernelBuilder.jsx`  
**Backend**: `routes/kernel.js` + socket handler `kernel:compile`

#### Tính năng

- **Code editor** (textarea, sẽ nâng cấp Monaco) cho file `.c`
- **6 templates** built-in:

| Template | Mô tả | Khái niệm minh hoạ |
|---|---|---|
| Hello World | `module_init`, `printk`, module params | Cấu trúc module cơ bản |
| Char Device | `register_chrdev`, file_operations | Major number, /dev mapping |
| Proc Entry | `proc_create`, proc_ops | /proc filesystem |
| Process List | `for_each_process` | Iterate task_struct |
| Sysfs Entry | `kobject_create_and_add` | /sys/kernel/* |
| Kernel Timer | `timer_setup`, `mod_timer` | Periodic callback |

- **Server samples**: Load file `.c` từ thư mục `kernel-samples/`
- **Auto-load checkbox**: Tự động `insmod` sau khi build
- **Realtime build streaming**: Output `make` được stream qua Socket.IO
- **Post-build actions**: insmod, rmmod, Check Status, Watch dmesg, Device Info
- **Device & Proc Mapping panel** (mới): Sau khi insmod, tự động hiển thị:
  - Major number từ `/proc/devices`
  - /proc entry nếu module tạo (`/proc/<name>`)
  - /dev entries nếu module tạo character device
  - Lệnh `mknod` gợi ý
- **Live dmesg**: Stream `dmesg -w` để xem kernel messages
- **Download `.c` file**

#### Quy trình build module

```
Bước 1: User soạn code C trong editor
        ↓
Bước 2: Click "Compile"
        ↓ (Socket.IO emit 'kernel:compile')
Bước 3: Backend tạo thư mục backend/kernel-modules/<modName>/
        ↓
Bước 4: Backend ghi file <modName>.c và Makefile vào thư mục
        ↓
Bước 5: spawn('make', [], { cwd: moduleDir })
        Stream stdout/stderr về client qua 'kernel:compile:log'
        ↓
Bước 6: Khi exit code = 0, file <modName>.ko được tạo
        Emit 'kernel:compile:done' với { success, koFile }
        ↓
Bước 7: Nếu autoLoad = true:
        spawn('sudo', ['insmod', koFile])
        ↓
Bước 8: Module được load vào kernel
        Frontend gọi GET /api/kernel/proc-devices để lấy major ID
        Hiển thị Device Mapping panel
```

#### Makefile được generate

```makefile
obj-m += <modName>.o

all:
	make -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) modules

clean:
	make -C /lib/modules/$(shell uname -r)/build M=$(CURDIR) clean

.PHONY: all clean
```

#### Ví dụ code template "Char Device"

```c
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/uaccess.h>

#define DEVICE_NAME "chardev_module"
static int major_num;
static char msg_buffer[256];
static int msg_len = 0;

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .open = dev_open,
    .release = dev_release,
    .read = dev_read,
    .write = dev_write,
};

static int __init chardev_init(void) {
    major_num = register_chrdev(0, DEVICE_NAME, &fops);
    printk(KERN_INFO "chardev: registered with major %d\n", major_num);
    printk(KERN_INFO "chardev: mknod /dev/%s c %d 0\n", DEVICE_NAME, major_num);
    return 0;
}

static void __exit chardev_exit(void) {
    unregister_chrdev(major_num, DEVICE_NAME);
}

module_init(chardev_init);
module_exit(chardev_exit);
MODULE_LICENSE("GPL");
```

Sau khi load → kernel cấp major number động → UI hiển thị:

```
Registered Character Device
Major Number: 240
Device Name : chardev_module

Create device: sudo mknod /dev/chardev_module c 240 0
```

---

### 7.3. Sub-module 3.2: Module Manager

**Frontend**: `components/Kernel/ModuleManager.jsx`  
**Backend**: `routes/kernel.js`

#### Tính năng
- Liệt kê tất cả module đã load (`lsmod`)
- 4 stat cards: Loaded modules, Kernel version, Active modules, Device Nodes
- Tìm kiếm module theo tên
- Click row → Modal info (`modinfo <name>`) qua Portal
- Unload với confirmation
- Load module từ path tùy ý (`.ko` file) + parameters
- Panel **Major ID Mapping** bên phải:
  - Hiển thị tất cả Character Devices từ `/proc/devices`
  - Hiển thị tất cả Block Devices từ `/proc/devices`
- Auto-refresh mỗi 5s

#### API Endpoints

| Method | Endpoint | Backend command |
|---|---|---|
| GET | `/api/kernel/modules` | `lsmod` |
| GET | `/api/kernel/module-info?module=` | `modinfo <name>` |
| POST | `/api/kernel/insmod` | `sudo insmod <path>` |
| POST | `/api/kernel/rmmod` | `sudo rmmod <name>` |
| POST | `/api/kernel/upload` | Multer upload `.ko` |
| GET | `/api/kernel/version` | `uname -r` |
| GET | `/api/kernel/info` | `uname -a` |
| **GET** | **`/api/kernel/proc-devices`** | `fs.readFile('/proc/devices')` |
| **GET** | **`/api/kernel/proc-modules`** | `fs.readFile('/proc/modules')` |
| **GET** | **`/api/kernel/module-devices/:name`** | Tìm `/dev/<name>*` |
| **GET** | **`/api/kernel/proc-entry/:name`** | Đọc `/proc/<name>` nếu có |

#### Cách parse /proc/devices

```javascript
// backend/src/routes/kernel.js
router.get('/proc-devices', async (req, res) => {
  const content = await fs.readFile('/proc/devices', 'utf-8');
  const lines = content.split('\n');
  const charDevices = [];
  const blockDevices = [];
  let section = '';
  
  for (const line of lines) {
    if (line.includes('Character devices')) { section = 'char'; continue; }
    if (line.includes('Block devices')) { section = 'block'; continue; }
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (match) {
      const entry = { major: parseInt(match[1]), name: match[2].trim() };
      if (section === 'char') charDevices.push(entry);
      else if (section === 'block') blockDevices.push(entry);
    }
  }
  res.json({ charDevices, blockDevices });
});
```

---

### 7.4. Sub-module 3.3: Kernel Logs

**Frontend**: `components/Kernel/KernelLogs.jsx`  
**Backend**: `routes/kernel.js` + socket `kernel:dmesg:watch`

#### Tính năng
- Đọc 200 dòng dmesg cuối qua HTTP
- Stream dmesg realtime qua Socket.IO (`dmesg -w`)
- Filter theo từ khóa
- Color-coded: error (red), warn (yellow), info (cyan)
- Auto-scroll, Download log
- Toggle Realtime ON/OFF

#### API + Socket Events

| Type | Endpoint/Event | Backend command |
|---|---|---|
| GET | `/api/kernel/dmesg?lines=200` | `dmesg \| tail -n 200` |
| Socket | `kernel:dmesg:watch` | `dmesg -w --color=never` (streaming) |
| Socket | `kernel:dmesg:line { line }` | Mỗi dòng kernel message |
| Socket | `kernel:dmesg:stop` | Dừng stream |


---

## 8. CƠ CHẾ TRUYỀN LỆNH BACKEND ↔ FRONTEND

### 8.1. Hai phương thức giao tiếp

Hệ thống dùng **đồng thời** hai cơ chế:

| Cơ chế | Khi nào dùng | Ví dụ |
|---|---|---|
| **HTTP REST (Axios)** | Lệnh nhanh, kết quả 1 lần | List files, Get process info, Add cron |
| **WebSocket (Socket.IO)** | Lệnh dài, cần stream output | apt install, kernel compile, dmesg watch |

### 8.2. Mô hình HTTP REST

#### Frontend (React)

```javascript
// frontend/src/utils/api.js
import axios from 'axios'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})
export default api
```

#### Sử dụng trong component

```javascript
// frontend/src/components/Process/ProcessManager.jsx
const r = await api.get('/process/list')
const procs = r.data.processes || []
```

#### Backend (Express)

```javascript
// backend/src/routes/process.js
router.get('/list', async (req, res) => {
  const ps = spawn('ps', ['aux']);
  let output = '';
  ps.stdout.on('data', (data) => { output += data.toString(); });
  ps.on('close', () => {
    const processes = parseOutput(output);
    res.json({ processes, count: processes.length });
  });
});
```

#### Quy tắc viết route an toàn

```javascript
// Mọi callback phải check headersSent để tránh ERR_HTTP_HEADERS_SENT
router.get('/foo', (req, res) => {
  const proc = spawn('cmd');
  proc.on('close', () => {
    if (res.headersSent) return;     // ← Quan trọng!
    res.json({ result: 'ok' });
  });
  proc.on('error', (err) => {
    if (res.headersSent) return;     // ← Tránh double send
    res.status(500).json({ error: err.message });
  });
});
```

### 8.3. Mô hình WebSocket (Socket.IO)

#### Backend setup

```javascript
// backend/src/index.js
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, methods: ['GET','POST'], credentials: true }
});
initSocketHandlers(io);
```

#### Backend handler (kernel compile)

```javascript
// backend/src/socket/socketManager.js
socket.on('kernel:compile', async (data) => {
  const { code, moduleName } = data;
  
  // 1. Tạo thư mục module
  const moduleDir = path.join(MODULES_DIR, moduleName);
  await fs.mkdir(moduleDir, { recursive: true });
  
  // 2. Ghi source code & Makefile
  await fs.writeFile(path.join(moduleDir, `${moduleName}.c`), code);
  await fs.writeFile(path.join(moduleDir, 'Makefile'), MAKEFILE_TEMPLATE);
  
  // 3. Spawn make với cwd = moduleDir
  const make = spawn('make', [], { cwd: moduleDir });
  
  // 4. Stream output
  make.stdout.on('data', (d) => {
    d.toString().split('\n').forEach(line => {
      socket.emit('kernel:compile:log', { line, level: 'info' });
    });
  });
  
  make.stderr.on('data', (d) => {
    d.toString().split('\n').forEach(line => {
      const level = line.includes('error') ? 'error' : 'warn';
      socket.emit('kernel:compile:log', { line, level });
    });
  });
  
  // 5. Khi xong
  make.on('close', (code) => {
    socket.emit('kernel:compile:done', { 
      success: code === 0, 
      koFile: path.join(moduleDir, `${moduleName}.ko`)
    });
  });
});
```

#### Frontend nhận stream

```javascript
// frontend/src/components/Kernel/KernelBuilder.jsx
useEffect(() => {
  if (!socket) return;
  
  const onLog = (d) => setBuildLogs(prev => [...prev, { line: d.line, level: d.level }]);
  const onDone = (d) => { setBuilding(false); setBuildResult(d); };
  
  socket.on('kernel:compile:log', onLog);
  socket.on('kernel:compile:done', onDone);
  
  return () => {
    socket.off('kernel:compile:log');
    socket.off('kernel:compile:done');
  };
}, [socket]);

// Trigger compile
const compile = () => {
  socket.emit('kernel:compile', { code, moduleName, autoLoad });
};
```

### 8.4. Sơ đồ tổng hợp các Socket events

```
┌──────────────────────────────────────────────────────────────┐
│  TERMINAL                                                    │
│  → terminal:execute    ← terminal:output / error / close    │
├──────────────────────────────────────────────────────────────┤
│  KERNEL                                                      │
│  → kernel:compile      ← kernel:compile:log / :done          │
│  → kernel:dmesg:watch  ← kernel:dmesg:line                   │
│  → kernel:dmesg:stop                                         │
├──────────────────────────────────────────────────────────────┤
│  PACKAGES                                                    │
│  → packages:install    ← packages:output / :close            │
│  → packages:remove                                           │
├──────────────────────────────────────────────────────────────┤
│  STRACE                                                      │
│  → strace:start        ← strace:line / :done                 │
│  → strace:cancel                                             │
├──────────────────────────────────────────────────────────────┤
│  METRICS                                                     │
│  → metrics:start       ← metrics:update                      │
│  → metrics:stop                                              │
├──────────────────────────────────────────────────────────────┤
│  FILES                                                       │
│  → files:watch         ← files:change                        │
│  → files:unwatch                                             │
├──────────────────────────────────────────────────────────────┤
│  ACTIVITY (broadcast tới mọi client)                         │
│  ← activity:log        (mọi command đã thực thi)             │
│  → activity:replay     ← activity:replay (entries)           │
└──────────────────────────────────────────────────────────────┘
```

### 8.5. Cách backend thực thi lệnh hệ thống

Backend dùng **3 cơ chế** khác nhau tùy nhu cầu:

#### 8.5.1. `child_process.spawn()` — Phổ biến nhất

```javascript
const { spawn } = require('child_process');
const proc = spawn('command', ['arg1', 'arg2'], { cwd: '/some/dir' });

proc.stdout.on('data', (d) => { /* nhận chunks output */ });
proc.stderr.on('data', (d) => { /* nhận chunks error */ });
proc.on('close', (code) => { /* exit code */ });
proc.on('error', (err) => { /* spawn failed */ });

// Timeout
setTimeout(() => proc.kill('SIGTERM'), 30000);
```

**Ưu điểm**: Streaming, không buffer toàn bộ output, an toàn (không qua shell).

#### 8.5.2. `spawn('bash', ['-c', cmd])` — Khi cần shell features

```javascript
// Cho lệnh có pipe, glob, redirect
spawn('bash', ['-c', 'find / -name "*.log" | xargs wc -l']);
```

**Lưu ý bảo mật**: Chỉ dùng cho command đã validate, không dùng với input từ user thô.

#### 8.5.3. `fs.promises.*` — Cho thao tác file thuần

```javascript
const fs = require('fs').promises;
await fs.readFile('/proc/devices', 'utf-8');
await fs.writeFile(scriptPath, content);
await fs.chmod(scriptPath, 0o755);
```

**Ưu điểm**: Nhanh, không cần spawn process mới.

### 8.6. Activity broadcast bus

Mọi command thật thi xong đều được log + broadcast tới tất cả clients đang kết nối:

```javascript
// backend/src/utils/activity.js
function log(entry) {
  const e = {
    id: Date.now() + ':' + Math.random().toString(36).slice(2,7),
    ts: new Date().toISOString(),
    scope: entry.scope,        // files | process | kernel | cron | packages | strace
    command: entry.command,    // command string đã chạy
    code: entry.code,          // exit code
    output: entry.output,      // snippet output
    level: entry.level,        // info | success | error | warn
  };
  ringBuffer.push(e);
  ioRef.emit('activity:log', e);  // broadcast
}
```

UI có panel `<ActivityLog scope="kernel" />` để hiển thị realtime activity log filter theo scope.


---

## 9. BẢO MẬT & CẤU HÌNH QUYỀN

### 9.1. Vấn đề: Một số lệnh cần `sudo`

Các lệnh sau **bắt buộc** chạy với quyền root:
- `insmod`, `rmmod`: load/unload kernel module
- `apt-get install/remove`: cài/gỡ package
- `timedatectl set-time/timezone`: đổi thời gian hệ thống
- `dmesg`: đọc kernel log (trên một số hệ thống)

### 9.2. Giải pháp: NOPASSWD sudoers

Để tránh phải nhập password mỗi lần, cấu hình `/etc/sudoers.d/linux-dashboard`:

```bash
# scripts/setup-sudoers.sh
codewalker ALL=(ALL) NOPASSWD: /usr/bin/apt-get
codewalker ALL=(ALL) NOPASSWD: /usr/bin/apt
codewalker ALL=(ALL) NOPASSWD: /sbin/insmod
codewalker ALL=(ALL) NOPASSWD: /sbin/rmmod
codewalker ALL=(ALL) NOPASSWD: /sbin/modprobe
codewalker ALL=(ALL) NOPASSWD: /usr/bin/dmesg
codewalker ALL=(ALL) NOPASSWD: /usr/bin/timedatectl
codewalker ALL=(ALL) NOPASSWD: /usr/bin/systemctl
codewalker ALL=(ALL) NOPASSWD: /usr/bin/strace
codewalker ALL=(ALL) NOPASSWD: /usr/bin/chmod
codewalker ALL=(ALL) NOPASSWD: /usr/bin/mknod
```

Chạy 1 lần:
```bash
sudo bash scripts/setup-sudoers.sh
```

Backend sau đó dùng `sudo -n <cmd>` để thực thi (flag `-n` = non-interactive, fail nếu cần password).

### 9.3. Command validator

`backend/src/utils/commandValidator.js` blacklist các lệnh nguy hiểm:

```javascript
const BLACKLISTED_COMMANDS = [
  'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=/dev/zero',
  ':(){:|:&};:',  // fork bomb
  'chmod -R 777 /', '> /dev/sda', 'shred', 'wipefs',
];

const injectionPatterns = [
  /;\s*rm\s+-rf/, /&&\s*rm\s+-rf/, /\|\s*rm\s+-rf/,
  /`[^`]*`/,       // backtick execution
  /\$\([^)]*\)/,   // command substitution
];
```

### 9.4. Path traversal protection

```javascript
// Tất cả file API đều check
if (file.includes('..')) {
  return res.status(403).json({ error: 'Directory traversal not allowed' });
}
```

### 9.5. Helmet HTTP security headers

```javascript
// backend/src/index.js
app.use(helmet({ contentSecurityPolicy: false }));
```

### 9.6. CORS policy

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## 10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY

### 10.1. Yêu cầu hệ thống

- **OS**: Ubuntu 20.04+ (hoặc Debian-based)
- **Node.js**: v18+ (tốt nhất v20)
- **Build tools**: `sudo apt install build-essential linux-headers-$(uname -r)`
- **System tools**: `sudo apt install strace traceroute dnsutils inotify-tools`

### 10.2. Setup lần đầu

```bash
# 1. Clone project
cd ~/Desktop/lap-trinh-nhan-linux/linux-dashboard

# 2. Cấu hình NOPASSWD sudo (CHẠY 1 LẦN)
sudo bash scripts/setup-sudoers.sh

# 3. Cài backend dependencies
cd backend
npm install

# 4. Cài frontend dependencies
cd ../frontend
npm install
```

### 10.3. Khởi động (Development)

```bash
# Terminal 1: Backend
cd backend
npm run dev    # nodemon → tự reload khi code thay đổi
# → Backend chạy tại http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# → Frontend chạy tại http://localhost:5173
```

Hoặc dùng script tổng:
```bash
bash scripts/start.sh dev
```

### 10.4. Khởi động (Production - Docker)

```bash
docker-compose up -d
# Backend:  http://localhost:3001
# Frontend: http://localhost:5173
```

### 10.5. Khởi động (PM2 - Production không Docker)

```bash
bash scripts/start.sh pm2
pm2 status   # xem trạng thái
pm2 logs     # xem log
```

### 10.6. Build kernel module thủ công (test)

```bash
cd kernel-samples
make
sudo insmod hello_module.ko
dmesg | tail
sudo rmmod hello_module
```

---

## 11. PHỤ LỤC

### 11.1. Danh sách full lệnh shell mà backend thực thi

| Module | Lệnh | Tham số chính |
|---|---|---|
| **Files** | `ls`, `find`, `chmod`, `chown`, `mkdir`, `rm`, `tar` | path, mode |
| **Cron** | `crontab` | `-l`, `-` (stdin) |
| **Time** | `timedatectl` | `set-time`, `set-timezone` |
| **Packages** | `apt-get`, `apt`, `dpkg` | `install`, `remove`, `-l`, `search` |
| **Process** | `ps`, `pstree`, `top` | `aux`, `-b -n 1` |
| **Signals** | (Node.js `process.kill`) | SIGTERM/SIGKILL/SIGHUP/... |
| **Resources** | `df`, `free`, (Node.js `os.*`) | `-h` |
| **Network** | `ping`, `traceroute`, `dig`, `ifconfig`, `ip`, `ss` | `-c`, `-tuln`, `-tlnp`, `-s` |
| **Logs** | `journalctl`, `dmesg`, `tail` | `-n`, `--no-pager`, `-f` |
| **Strace** | `strace` | `-c -f`, `-p <pid>`, `-tt -T -s 120` |
| **Kernel** | `lsmod`, `modinfo`, `modprobe`, `insmod`, `rmmod`, `make`, `uname`, `dmesg` | `-r`, `-a`, `-w` |
| **File watch** | `inotifywait` | `-m -e modify,create,delete` |

### 11.2. Cấu trúc /proc/devices (ví dụ output)

```
Character devices:
  1 mem
  4 /dev/vc/0
  4 tty
  4 ttyS
  5 /dev/tty
  5 /dev/console
  240 chardev_module       ← Module của chúng ta
  ...

Block devices:
  7 loop
  8 sd
  ...
```

UI parse theo regex `^(\d+)\s+(.+)$` để lấy `{ major, name }`.

### 11.3. Cấu trúc /proc/modules (ví dụ output)

```
hello_module 16384 0 - Live 0xffffffffc0c80000 (OE)
chardev_module 16384 0 - Live 0xffffffffc0c70000 (OE)
nf_conntrack 188416 4 nft_ct,xt_conntrack,nf_nat,nft_chain_nat, Live 0xffffffffc0a00000
```

Mỗi dòng: `name | size | refCount | usedBy | state | offset`.

### 11.4. Cấu trúc Cron expression

```
* * * * * command
│ │ │ │ │
│ │ │ │ └─── day of week  (0-7, 0&7=Sun)
│ │ │ └───── month        (1-12)
│ │ └─────── day of month (1-31)
│ └───────── hour          (0-23)
└─────────── minute        (0-59)
```

Ví dụ: `0 2 * * *` = mỗi ngày lúc 2:00 sáng.

### 11.5. Lifecycle của một Kernel Module

```
[Source .c] ──make──► [Object .o] ──link──► [Module .ko]
                                                  │
                                              insmod
                                                  ▼
                                          ┌────────────┐
                                          │ Loaded     │
                                          │ in kernel  │
                                          │ memory     │
                                          └─────┬──────┘
                                                │
                              register_chrdev   │
                              proc_create       │── Tạo entry
                              kobject_create    │   /proc, /sys, /dev
                                                │
                                              rmmod
                                                ▼
                                          [Unloaded]
```

`module_init()` được gọi khi insmod. `module_exit()` được gọi khi rmmod. Trong giữa hai mốc này, module có thể tạo các kernel resources (devices, proc entries, sysfs, timer, ...) mà userspace có thể tương tác.

### 11.6. Mã nguồn các kernel sample

Project có **9 kernel modules mẫu** trong `kernel-samples/`:

| File | Khái niệm minh họa |
|---|---|
| `hello_module.c` | Module cơ bản, module_param |
| `chardev_module.c` | Character device, alloc_chrdev_region, cdev |
| `proc_module.c` | proc_fs, seq_file |
| `sysfs_module.c` | kobject, kobj_attribute |
| `timer_module.c` | timer_list, mod_timer, jiffies |
| `process_monitor.c` | for_each_process, task_struct |
| `memory_monitor.c` | si_meminfo, struct sysinfo |
| `netfilter_logger.c` | nf_register_net_hook, NF_INET_PRE_ROUTING |
| `syscall_count.c` | Hook syscall (giáo dục, không production) |

Và **6 userspace demos** trong `kernel-samples/userspace-demos/`:

| File | Khái niệm |
|---|---|
| `fork_demo.c` | `fork()`, `wait()` |
| `zombie_demo.c` | Tạo zombie có chủ đích |
| `orphan_demo.c` | Orphan process được init nhận nuôi |
| `tcp_echo_server.c` | `socket()`, `bind()`, `listen()`, `accept()` |
| `tcp_echo_client.c` | `connect()`, `send()`, `recv()` |
| `uds_demo.c` | Unix Domain Socket |

---

## 12. KẾT LUẬN

### 12.1. Đáp ứng yêu cầu môn học

| Yêu cầu môn học | Đáp ứng trong dự án |
|---|---|
| Lập trình shell quản lý file | File Manager (frontend) + 10 endpoints `/api/shell/files/*` |
| Lập lịch tác vụ | Cron Manager với 6 templates Bash/Python, GUI tạo crontab |
| Thiết lập thời gian hệ thống | System Time + `timedatectl` integration |
| Cài đặt/gỡ chương trình tự động | Package Manager với apt streaming + Automation Hub |
| Quản lý tiến trình | Process Manager với 6 signals, /proc/<pid>/status |
| Quản lý file (system level) | File CRUD + chmod + permissions display |
| Quản lý socket | Socket Monitor (TCP/UDP) + suspicious port detection |
| Quản lý network | Network Tools (ping/traceroute/DNS/ifconfig) |
| Lập trình mô-đun nhân | Kernel Builder (compile + insmod) + Module Manager |
| Tích hợp module vào hệ thống | Auto insmod, /proc/devices mapping, dmesg streaming, mknod gợi ý |

### 12.2. Đóng góp kỹ thuật

- **Realtime architecture**: Mọi long-running command đều stream qua Socket.IO, không cần polling.
- **Educational UI**: Mỗi feature có nút "Explain" giải thích syscall và concept liên quan.
- **Safe sudo strategy**: NOPASSWD whitelist thay vì hardcode password.
- **Portal-based modals**: Tránh overflow clipping issue trong nested layout.
- **Activity bus**: Audit trail mọi command, broadcast realtime.
- **Light/Dark theme**: CSS variables tách biệt logic và style.

### 12.3. Hướng phát triển

- Thêm authentication (JWT)
- WebSocket multiplexing cho multi-tab
- Role-based access control
- Persistent activity log (SQLite)
- Monaco editor với syntax highlighting cho kernel C
- Auto-suggest module template dựa vào use case

---

## TÀI LIỆU THAM KHẢO

1. **Linux Kernel Module Programming Guide** — Peter Jay Salzman, Michael Burian, Ori Pomerantz
2. **The Linux Programming Interface** — Michael Kerrisk
3. **Express.js Documentation** — https://expressjs.com
4. **Socket.IO Documentation** — https://socket.io/docs
5. **React Documentation** — https://react.dev
6. **man pages**: `man 2 syscalls`, `man crontab`, `man strace`, `man dmesg`
7. **/proc filesystem**: `man 5 proc`
8. **Kernel headers**: `/usr/src/linux-headers-$(uname -r)/`

---

*Báo cáo được tạo tự động bởi quá trình phân tích codebase.*
