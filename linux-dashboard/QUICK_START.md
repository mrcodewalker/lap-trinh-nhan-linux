# Linux Dashboard - Quick Start Guide

Get up and running in 5 minutes!

## ⚡ 5-Minute Setup

### 1. Prerequisites Check
```bash
# Check Node.js
node --version  # Should be 18+
npm --version   # Should be 9+

# Check Linux
uname -a
```

### 2. Clone & Install
```bash
git clone <repo>
cd linux-dashboard

# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

### 3. Start Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Login: `admin` / `admin123`

## 🎯 Common Tasks

### View Logs
```bash
# Backend logs
tail -f backend/logs/combined.log

# System logs
journalctl -f
```

### Kill Processes
```bash
# Port 3001
lsof -ti:3001 | xargs kill -9

# Port 5173
lsof -ti:5173 | xargs kill -9
```

### Reset Everything
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Production Deploy
```bash
# With Docker
docker-compose up -d

# With PM2
./scripts/start.sh pm2 3001
```

## 🔐 Security Checklist

- [ ] Change default credentials in `backend/src/routes/auth.js`
- [ ] Update JWT_SECRET in `.env`
- [ ] Enable HTTPS in production
- [ ] Configure firewall
- [ ] Set NODE_ENV=production
- [ ] Review CORS settings

## 📊 Monitoring

```bash
# System resources
top

# Network connections
netstat -tuln

# Disk usage
df -h

# Process list
ps aux | grep node
```

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `lsof -ti:PORT \| xargs kill -9` |
| Permission denied | Run with `sudo` or check sudoers |
| Module not found | `rm -rf node_modules && npm install` |
| Socket connection failed | Check firewall: `sudo ufw allow 3001` |
| Cannot execute commands | Check sudo access: `sudo -l` |

## 📚 Key Files

| File | Purpose |
|------|---------|
| `backend/src/index.js` | Main server |
| `frontend/src/App.jsx` | Main app |
| `backend/.env` | Backend config |
| `frontend/.env.local` | Frontend config |
| `docker-compose.yml` | Docker setup |
| `scripts/start.sh` | Startup script |

## 🔌 API Quick Reference

```bash
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get processes
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/process/list

# Get system info
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/system/info
```

## 🎨 UI Features

- **Sidebar**: Navigation between 3 main tabs
- **Header**: Real-time status and clock
- **Terminal**: Full command execution
- **Charts**: Real-time metrics
- **Tables**: Process and connection lists
- **Forms**: File upload, cron creation

## 🚀 Performance Tips

1. Use production build: `npm run build`
2. Enable caching headers
3. Use CDN for static files
4. Monitor with: `top`, `htop`, `iotop`
5. Check logs regularly

## 📱 Responsive Design

- **Desktop**: Full features
- **Tablet**: Optimized layout
- **Mobile**: Sidebar collapses

## 🔄 Update Process

```bash
# Pull latest
git pull origin main

# Update dependencies
npm update

# Rebuild
npm run build

# Restart
pm2 restart linux-dashboard-api
```

## 💡 Tips & Tricks

```bash
# Watch logs in real-time
tail -f backend/logs/combined.log

# Monitor specific process
watch -n 1 'ps aux | grep node'

# Check open ports
sudo netstat -tulpn | grep LISTEN

# View system info
neofetch

# Check disk usage
du -sh * | sort -h
```

## 🎓 Learning Resources

- [Linux Man Pages](https://man7.org/)
- [Node.js Docs](https://nodejs.org/docs/)
- [React Docs](https://react.dev/)
- [Socket.IO Guide](https://socket.io/docs/)

## 📞 Quick Help

```bash
# Show help
./scripts/start.sh

# Check Node version
node -v

# Check npm version
npm -v

# List npm packages
npm list

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] .env files created
- [ ] Backend running on 3001
- [ ] Frontend running on 5173
- [ ] Can login with admin/admin123
- [ ] Terminal works
- [ ] Can view processes

## 🎯 Next Steps

1. ✅ Get it running (you are here)
2. 📖 Read SETUP.md for detailed setup
3. 🔐 Configure security
4. 🚀 Deploy to production
5. 📊 Monitor and maintain

---

**You're all set! Happy hacking! 🚀**
