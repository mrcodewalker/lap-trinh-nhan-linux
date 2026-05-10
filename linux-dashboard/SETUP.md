# Linux Dashboard - Setup Guide

Complete setup instructions for Ubuntu, Kali Linux, and other Linux distributions.

## 📋 System Requirements

- **OS**: Ubuntu 20.04+, Kali Linux, or any Debian-based Linux
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **RAM**: 2GB minimum
- **Disk**: 500MB free space
- **Sudo access**: Required for system operations

## 🔧 Installation

### 1. Install Node.js and npm

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Kali Linux:**
```bash
sudo apt update
sudo apt install -y nodejs npm
```

**Verify installation:**
```bash
node --version
npm --version
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/linux-dashboard.git
cd linux-dashboard
```

### 3. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Create necessary directories
mkdir -p logs uploads kernel-modules
```

**Edit `.env` file:**
```bash
nano .env
```

Set these values:
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-key-change-in-production
LOG_LEVEL=info
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cat > .env.local << EOF
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
EOF
```

## 🚀 Running the Application

### Development Mode

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

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

### Production Mode with Docker

**Prerequisites:**
```bash
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

**Start services:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop services:**
```bash
docker-compose down
```

### PM2 Production

**Install PM2:**
```bash
npm install -g pm2
```

**Start services:**
```bash
./scripts/start.sh pm2 3001
```

**Manage with PM2:**
```bash
pm2 status
pm2 logs
pm2 stop linux-dashboard-api
pm2 restart linux-dashboard-api
```

## 🔐 Security Configuration

### 1. Change Default Credentials

Edit `backend/src/routes/auth.js` and update the users array:

```javascript
const users = [
  {
    id: '1',
    username: 'your-admin-username',
    password: '$2a$10$...', // bcrypt hash
    role: 'admin',
    name: 'Your Name'
  }
];
```

Generate bcrypt hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

### 2. Update JWT Secret

In `.env`:
```
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
```

Generate random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Firewall

```bash
# Allow ports
sudo ufw allow 3001/tcp
sudo ufw allow 5173/tcp

# Enable firewall
sudo ufw enable
```

### 4. SSL/TLS Setup (Production)

Use Nginx with Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with SSL certificates
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Permission Denied

```bash
# Run with sudo
sudo npm run dev

# Or add user to sudoers for specific commands
sudo visudo
# Add: username ALL=(ALL) NOPASSWD: /bin/bash
```

### Socket.IO Connection Failed

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check firewall
sudo ufw status
sudo ufw allow 3001/tcp
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Cannot Execute Commands

```bash
# Check sudo access
sudo -l

# Grant sudo without password (use with caution)
sudo visudo
# Add: username ALL=(ALL) NOPASSWD: ALL
```

## 📊 Monitoring

### View Logs

**Backend logs:**
```bash
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

**System logs:**
```bash
journalctl -u linux-dashboard -f
```

### Performance Monitoring

```bash
# Monitor processes
top

# Monitor network
netstat -tuln

# Monitor disk
df -h
du -sh *

# Monitor memory
free -h
```

## 🔄 Updates

### Update Dependencies

```bash
# Backend
cd backend
npm update

# Frontend
cd frontend
npm update
```

### Update Application

```bash
git pull origin main
npm install
npm run build
```

## 🚀 Deployment

### Ubuntu Server

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repo> /opt/linux-dashboard
cd /opt/linux-dashboard

# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start backend/src/index.js --name linux-dashboard-api
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install -y nginx
# Configure nginx.conf
sudo systemctl restart nginx
```

### Kali Linux

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
sudo apt install -y nodejs npm

# Follow Ubuntu steps above
```

### Docker Deployment

```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## 📝 Configuration Files

### Backend Configuration

**`.env` file:**
```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-secret-key
LOG_LEVEL=info
```

### Frontend Configuration

**`.env.local` file:**
```
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

## 🔗 Useful Commands

```bash
# Start development
./scripts/start.sh dev

# Start production
./scripts/start.sh prod

# Start with PM2
./scripts/start.sh pm2

# View system info
uname -a
lsb_release -a

# Check Node.js version
node -v
npm -v

# Check ports
netstat -tuln | grep LISTEN

# View running processes
ps aux | grep node
```

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Linux Man Pages](https://man7.org/linux/man-pages/)

## 🆘 Getting Help

1. Check logs: `tail -f backend/logs/combined.log`
2. Check system: `dmesg | tail -20`
3. Check network: `netstat -tuln`
4. Check processes: `ps aux | grep node`

---

**Happy System Programming! 🚀**
