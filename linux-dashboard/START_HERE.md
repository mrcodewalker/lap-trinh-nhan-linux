# Linux Dashboard v2.0 - START HERE

## 🚀 Quick Start (2 minutes)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access Dashboard

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

**No login required!** Direct access to all features.

---

## 📋 What's New in v2.0

### ✅ Removed
- Authentication system
- User roles & permissions
- Login page
- JWT tokens
- Command validation

### ✅ Added
- Direct system access
- 3 focused modules
- 45+ API endpoints
- Real-time streaming
- Advanced modals & interactions

---

## 🎯 3 Main Modules

### 1️⃣ Shell & Automation
**URL**: http://localhost:5173/shell

**Features**:
- 📁 File Manager - Browse, edit, upload files
- ⏰ Cron Jobs - Schedule tasks
- 📦 Packages - Install/remove software
- 🕐 System Time - Manage timezone & time

**API**: `/api/shell/*`

### 2️⃣ Process & Network
**URL**: http://localhost:5173/process

**Features**:
- 🔄 Process Manager - Monitor & kill processes
- 📊 Resources - CPU, RAM, Disk charts
- 🔌 Sockets - View connections & ports
- 🌐 Network Tools - Ping, traceroute, DNS

**API**: `/api/process/*`

### 3️⃣ Kernel Modules
**URL**: http://localhost:5173/kernel

**Features**:
- 📦 Module Manager - Load/unload modules
- 📜 Kernel Logs - View dmesg output
- 🔨 Module Builder - Write & compile modules

**API**: `/api/kernel/*`

---

## 💻 Example Commands

### Terminal Execution
```javascript
// Via Socket.IO
socket.emit('terminal:execute', {
  command: 'ls -la /home',
  id: 1
})

// Listen for output
socket.on('terminal:output', (data) => {
  console.log(data.data)
})
```

### File Operations
```bash
# List files
curl http://localhost:3001/api/shell/files/list?dir=/home

# Read file
curl http://localhost:3001/api/shell/files/read?file=/etc/hostname

# Write file
curl -X POST http://localhost:3001/api/shell/files/write \
  -H "Content-Type: application/json" \
  -d '{"file":"/tmp/test.txt","content":"Hello"}'
```

### Process Management
```bash
# List processes
curl http://localhost:3001/api/process/list

# Kill process
curl -X POST http://localhost:3001/api/process/kill \
  -H "Content-Type: application/json" \
  -d '{"pid":1234,"signal":"SIGTERM"}'
```

### Kernel Modules
```bash
# List modules
curl http://localhost:3001/api/kernel/modules

# Get module info
curl http://localhost:3001/api/kernel/module-info?module=ext4

# Load module
curl -X POST http://localhost:3001/api/kernel/insmod \
  -H "Content-Type: application/json" \
  -d '{"module":"/path/to/module.ko"}'
```

---

## 🔌 Real-time Features

### Terminal Streaming
```javascript
socket.emit('terminal:execute', { command: 'top', id: 1 })
socket.on('terminal:output', (data) => console.log(data.data))
socket.on('terminal:close', (data) => console.log('Done:', data.code))
```

### System Metrics
```javascript
socket.emit('metrics:start')
socket.on('metrics:update', (data) => console.log(data.data))
socket.emit('metrics:stop')
```

### Process Monitoring
```javascript
socket.emit('process:monitor', { pid: 1234 })
socket.on('process:update', (data) => console.log(data.data))
socket.emit('process:stop-monitor')
```

### Kernel Logs
```javascript
socket.emit('kernel:logs-stream')
socket.on('kernel:log', (data) => console.log(data.message))
socket.emit('kernel:stop-stream')
```

---

## 📁 Project Structure

```
linux-dashboard/
├── backend/
│   ├── src/
│   │   ├── index.js              # Main server
│   │   ├── routes/
│   │   │   ├── shell.js          # 20 endpoints
│   │   │   ├── process.js        # 20 endpoints
│   │   │   └── kernel.js         # 11 endpoints
│   │   ├── socket/
│   │   │   └── socketManager.js  # Real-time handlers
│   │   └── utils/
│   │       └── logger.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Shell.jsx
│   │   │   ├── Process.jsx
│   │   │   └── Kernel.jsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── Terminal/
│   │   │   ├── Shell/
│   │   │   ├── Process/
│   │   │   └── Kernel/
│   │   ├── store/
│   │   │   └── socketStore.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Module Not Found
```bash
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

### Socket Connection Failed
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check firewall
sudo ufw allow 3001
sudo ufw allow 5173
```

### Permission Denied
```bash
# Run with sudo
sudo npm run dev

# Or add to sudoers
sudo visudo
# Add: username ALL=(ALL) NOPASSWD: ALL
```

---

## 📊 API Endpoints

### Shell Module (20 endpoints)
- File operations: list, read, write, create, delete, rename, chmod, mkdir, upload, search
- Cron jobs: list, add, remove
- Packages: list, search, install, remove
- System time: info, set, timezone

### Process Module (20 endpoints)
- Processes: list, tree, info, kill, top
- Resources: CPU, memory, disk, uptime
- Network: interfaces, connections, ports, stats, ping, traceroute, DNS, ifconfig
- Logs: journalctl, auth, kernel

### Kernel Module (11 endpoints)
- Modules: list, info, load, unload, upload
- Logs: dmesg, version, info
- Build: compile, build, template

---

## 🎨 UI Features

- **Cyberpunk Design**: Dark theme with neon colors
- **Real-time Updates**: Live charts & metrics
- **Modal Dialogs**: Detailed views & editing
- **Terminal Emulation**: Full Xterm.js integration
- **Responsive**: Mobile, tablet, desktop
- **Smooth Animations**: Framer Motion transitions

---

## 🔒 Security

⚠️ **No Authentication** - Use in trusted environments only!

- Direct system access
- No user isolation
- Full command execution
- Use on localhost or VPN
- Consider reverse proxy auth

---

## 📚 Learning Resources

- [Linux Man Pages](https://man7.org/)
- [Node.js Docs](https://nodejs.org/docs/)
- [React Docs](https://react.dev/)
- [Socket.IO Guide](https://socket.io/docs/)

---

## 🚀 Next Steps

1. ✅ Start backend & frontend
2. ✅ Open http://localhost:5173
3. ✅ Explore Shell module
4. ✅ Try Process module
5. ✅ Build kernel module
6. ✅ Deploy to production

---

## 📞 Quick Help

```bash
# Check Node version
node -v

# Check npm version
npm -v

# View backend logs
tail -f backend/logs/combined.log

# View system info
uname -a

# Check open ports
netstat -tuln | grep LISTEN

# Monitor processes
top
```

---

**Ready to go! Happy hacking! 🚀**
