# Linux Dashboard - Cyberpunk System Programming Center

A futuristic, real-time Linux system management dashboard built with React, Node.js, and Socket.IO. Perfect for Linux System Programming education and professional system administration.

## 🎯 Features

### Shell & Automation Center
- **Terminal Panel**: Real-time Xterm.js terminal with command history
- **File Manager**: Browse, upload, download, and manage files with permissions
- **Package Manager**: Install, remove, and search packages via apt
- **Cron Jobs**: Create, edit, and manage scheduled tasks
- **System Time**: View and manage system timezone and time

### Process & Network Monitor
- **Process Manager**: Real-time process monitoring with CPU/RAM usage
- **Resource Monitor**: Live charts for CPU, memory, and disk usage
- **Socket Monitor**: View active connections and listening ports
- **Network Tools**: Ping, traceroute, DNS lookup utilities

### Kernel Module Center
- **Module Manager**: Load, unload, and manage kernel modules
- **Kernel Logs**: Real-time dmesg output with filtering
- **Module Builder**: Write and compile kernel modules with Monaco editor

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS + Framer Motion
- Socket.IO client for real-time updates
- Xterm.js for terminal emulation
- Recharts for data visualization
- Monaco Editor for code editing

### Backend
- Node.js + Express
- Socket.IO for real-time streaming
- Child Process for Linux command execution
- JWT authentication
- Winston logging

### Linux Integration
- Ubuntu/Kali Linux compatible
- Direct shell command execution
- System metrics via /proc filesystem
- inotify for file watching
- journalctl for system logs

## 📋 Prerequisites

- Linux system (Ubuntu 20.04+ or Kali Linux)
- Node.js 18+
- npm or yarn
- sudo access for system operations

## 🚀 Quick Start

### Development Mode

```bash
# Clone and setup
git clone <repo>
cd linux-dashboard

# Make startup script executable
chmod +x scripts/start.sh

# Start development servers
./scripts/start.sh dev
```

Access:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Production with Docker

```bash
./scripts/start.sh prod
```

### PM2 Production

```bash
./scripts/start.sh pm2 3001
```

## 🔐 Authentication

Default credentials:
- **Admin**: `admin` / `admin123`
- **User**: `user` / `user123`

⚠️ Change these in production!

## 📁 Project Structure

```
linux-dashboard/
├── backend/
│   ├── src/
│   │   ├── index.js              # Main server
│   │   ├── routes/               # API endpoints
│   │   ├── middleware/           # Auth & validation
│   │   ├── socket/               # Socket.IO handlers
│   │   └── utils/                # Helpers
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                # Main pages
│   │   ├── components/           # React components
│   │   ├── store/                # Zustand stores
│   │   ├── utils/                # API client
│   │   └── index.css             # Tailwind styles
│   ├── package.json
│   └── Dockerfile
├── scripts/
│   └── start.sh                  # Startup script
└── docker-compose.yml
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Process Management
- `GET /api/process/list` - List processes
- `GET /api/process/tree` - Process tree
- `POST /api/process/kill` - Kill process
- `GET /api/process/top` - Top-like data

### Network
- `GET /api/network/interfaces` - Network interfaces
- `GET /api/network/connections` - Active connections
- `GET /api/network/ports` - Listening ports
- `POST /api/network/ping` - Ping host
- `POST /api/network/traceroute` - Traceroute
- `POST /api/network/dns` - DNS lookup

### File Management
- `GET /api/files/list` - List files
- `GET /api/files/read` - Read file
- `POST /api/files/write` - Write file
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/delete` - Delete file
- `POST /api/files/chmod` - Change permissions

### Packages
- `GET /api/packages/list` - List installed packages
- `GET /api/packages/search` - Search packages
- `POST /api/packages/install` - Install package
- `POST /api/packages/remove` - Remove package
- `POST /api/packages/update` - Update package list

### System
- `GET /api/system/info` - System information
- `GET /api/system/cpu` - CPU info
- `GET /api/system/memory` - Memory info
- `GET /api/system/disk` - Disk usage
- `GET /api/system/timezone` - Timezone info

### Kernel
- `GET /api/kernel/modules` - List modules
- `GET /api/kernel/dmesg` - Kernel messages
- `POST /api/kernel/insmod` - Load module
- `POST /api/kernel/rmmod` - Unload module

### Logs
- `GET /api/logs/journalctl` - Journal logs
- `GET /api/logs/kernel` - Kernel logs
- `GET /api/logs/auth` - Auth logs
- `GET /api/logs/search` - Search logs

### Cron
- `GET /api/cron/list` - List cron jobs
- `POST /api/cron/add` - Add cron job
- `DELETE /api/cron/remove` - Remove cron job

## 🔌 Socket.IO Events

### Terminal
- `terminal:execute` - Execute command
- `terminal:output` - Command output
- `terminal:error` - Command error
- `terminal:close` - Process closed

### Metrics
- `metrics:start` - Start metrics streaming
- `metrics:stop` - Stop metrics streaming
- `metrics:update` - Metrics data

### Files
- `files:watch` - Watch file changes
- `files:change` - File changed event
- `files:unwatch` - Stop watching

### Kernel
- `kernel:logs-stream` - Stream kernel logs
- `kernel:log` - Kernel log message
- `kernel:stop-stream` - Stop streaming

## 🎨 UI/UX Features

- **Cyberpunk Design**: Dark mode with neon accents
- **Glassmorphism**: Frosted glass effect cards
- **Smooth Animations**: Framer Motion transitions
- **Real-time Updates**: Socket.IO streaming
- **Responsive Layout**: Mobile-friendly design
- **Terminal Emulation**: Full xterm.js integration
- **Code Editor**: Monaco editor for kernel modules

## 🔒 Security

- JWT token-based authentication
- Command validation and sanitization
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers
- Role-based access control (admin/user)

## 📊 System Requirements

- **CPU**: 2+ cores
- **RAM**: 2GB minimum
- **Disk**: 500MB for application
- **Network**: Stable connection for real-time features

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Permission denied errors
```bash
# Run with sudo for system operations
sudo npm run dev
```

### Socket.IO connection issues
```bash
# Check firewall
sudo ufw allow 3001
sudo ufw allow 5173
```

## 📚 Learning Resources

- [Linux System Programming](https://man7.org/linux/man-pages/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [Socket.IO Guide](https://socket.io/docs/)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Built for Linux System Programming education and professional system administration.

---

**Made with ❤️ for Linux enthusiasts and system programmers**
