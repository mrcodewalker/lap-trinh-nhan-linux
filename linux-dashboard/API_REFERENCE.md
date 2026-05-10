# Linux Dashboard v2.0 - Complete API Reference

## Base URL
```
http://localhost:3001/api
```

## Health Check
```
GET /health
Response: { status: 'online', version: '2.0.0', modules: [...] }
```

---

## 🔧 SHELL & AUTOMATION MODULE

### File Management

#### List Files
```
GET /shell/files/list?dir=/home
Response: { files: [...], directory: '/home', count: 5 }
```

#### Read File
```
GET /shell/files/read?file=/etc/hostname
Response: { content: '...', file: '/etc/hostname', size: 10, modified: '...' }
```

#### Write File
```
POST /shell/files/write
Body: { file: '/tmp/test.txt', content: 'Hello World' }
Response: { message: 'File written successfully', file: '/tmp/test.txt' }
```

#### Create File
```
POST /shell/files/create
Body: { file: '/tmp/new.txt', content: '' }
Response: { message: 'File created successfully', file: '/tmp/new.txt' }
```

#### Delete File
```
POST /shell/files/delete
Body: { file: '/tmp/test.txt' }
Response: { message: 'File deleted successfully' }
```

#### Rename File
```
POST /shell/files/rename
Body: { oldPath: '/tmp/old.txt', newPath: '/tmp/new.txt' }
Response: { message: 'File renamed successfully' }
```

#### Change Permissions
```
POST /shell/files/chmod
Body: { file: '/tmp/test.txt', mode: '755' }
Response: { message: 'Permissions changed successfully' }
```

#### Create Directory
```
POST /shell/files/mkdir
Body: { dir: '/tmp/newdir' }
Response: { message: 'Directory created successfully' }
```

#### Upload File
```
POST /shell/files/upload
Content-Type: multipart/form-data
Body: { file: <binary> }
Response: { message: 'File uploaded successfully', file: { filename, path, size } }
```

#### Search Files
```
GET /shell/files/search?query=test&dir=/home
Response: { files: [...], count: 5 }
```

### Cron Jobs

#### List Cron Jobs
```
GET /shell/cron/list
Response: { jobs: [...], count: 3 }
Job: { id, minute, hour, dayOfMonth, month, dayOfWeek, command, schedule }
```

#### Add Cron Job
```
POST /shell/cron/add
Body: { 
  minute: '0', 
  hour: '12', 
  dayOfMonth: '*', 
  month: '*', 
  dayOfWeek: '*', 
  command: '/usr/bin/backup.sh' 
}
Response: { message: 'Cron job added successfully', job: '0 12 * * * /usr/bin/backup.sh' }
```

#### Remove Cron Job
```
POST /shell/cron/remove
Body: { id: 0 }
Response: { message: 'Cron job removed successfully' }
```

### Package Management

#### List Packages
```
GET /shell/packages/list
Response: { packages: [...], count: 500 }
Package: { status, name, version, arch, description }
```

#### Search Packages
```
GET /shell/packages/search?query=nginx
Response: { results: '...' }
```

#### Install Package
```
POST /shell/packages/install
Body: { package: 'nginx' }
Response: { message: 'Package installed successfully', output: '...', success: true }
```

#### Remove Package
```
POST /shell/packages/remove
Body: { package: 'nginx' }
Response: { message: 'Package removed successfully', output: '...', success: true }
```

### System Time

#### Get Time Info
```
GET /shell/time/info
Response: { 
  timezone: '...', 
  currentTime: '2024-01-01T12:00:00Z', 
  timestamp: 1704110400000 
}
```

#### Set System Time
```
POST /shell/time/set
Body: { datetime: '2024-01-01 12:00:00' }
Response: { message: 'System time updated successfully' }
```

#### Set Timezone
```
POST /shell/time/timezone
Body: { timezone: 'America/New_York' }
Response: { message: 'Timezone updated successfully' }
```

---

## 🔄 PROCESS & NETWORK MODULE

### Process Management

#### List Processes
```
GET /process/list
Response: { 
  processes: [...], 
  count: 150 
}
Process: { user, pid, cpu, mem, vsz, rss, tty, stat, start, time, command }
```

#### Process Tree
```
GET /process/tree
Response: { tree: '...' }
```

#### Get Process Info
```
GET /process/info/:pid
Response: { info: '...', pid: '1234' }
```

#### Kill Process
```
POST /process/kill
Body: { pid: 1234, signal: 'SIGTERM' }
Response: { message: 'Process 1234 killed with signal SIGTERM' }
```

#### Top-like Data
```
GET /process/top
Response: { data: '...' }
```

### System Resources

#### Get Resources
```
GET /process/resources
Response: {
  cpu: { count, model, speed },
  memory: { total, free, used, percentage },
  uptime, loadAverage, hostname, platform, arch
}
```

#### Get Disk Usage
```
GET /process/disk
Response: { 
  disks: [
    { filesystem, size, used, available, percentage, mounted }
  ]
}
```

### Network Monitoring

#### Get Interfaces
```
GET /process/network/interfaces
Response: { interfaces: '...' }
```

#### Get Connections
```
GET /process/network/connections
Response: { 
  connections: [...], 
  count: 50 
}
Connection: { proto, recvQ, sendQ, localAddr, peerAddr, state }
```

#### Get Ports
```
GET /process/network/ports
Response: { ports: '...' }
```

#### Get Stats
```
GET /process/network/stats
Response: { stats: '...' }
```

#### Ping Host
```
POST /process/network/ping
Body: { host: 'google.com', count: 4 }
Response: { result: '...', success: true }
```

#### Traceroute
```
POST /process/network/traceroute
Body: { host: 'google.com' }
Response: { result: '...' }
```

#### DNS Lookup
```
POST /process/network/dns
Body: { host: 'google.com' }
Response: { result: '...' }
```

#### Get ifconfig
```
GET /process/network/ifconfig
Response: { data: '...' }
```

### System Logs

#### Get Journalctl Logs
```
GET /process/logs/journalctl?lines=100&unit=nginx
Response: { logs: '...' }
```

#### Get Auth Logs
```
GET /process/logs/auth
Response: { logs: '...' }
```

#### Get Kernel Logs
```
GET /process/logs/kernel
Response: { logs: '...' }
```

---

## 🔨 KERNEL MODULE

### Module Management

#### List Modules
```
GET /kernel/modules
Response: { 
  modules: [...], 
  count: 50 
}
Module: { name, size, usedBy, dependencies }
```

#### Get Module Info
```
GET /kernel/module-info?module=ext4
Response: { info: '...' }
```

#### Load Module
```
POST /kernel/insmod
Body: { module: '/path/to/module.ko', params: 'param1=value1' }
Response: { message: 'Module loaded successfully' }
```

#### Unload Module
```
POST /kernel/rmmod
Body: { module: 'ext4' }
Response: { message: 'Module unloaded successfully' }
```

#### Upload Module
```
POST /kernel/upload
Content-Type: multipart/form-data
Body: { module: <binary .ko file> }
Response: { 
  message: 'Module uploaded successfully', 
  file: { filename, originalName, size, path } 
}
```

### Kernel Logs

#### Get dmesg
```
GET /kernel/dmesg?lines=100
Response: { messages: '...' }
```

#### Get Kernel Version
```
GET /kernel/version
Response: { version: '5.15.0-56-generic' }
```

#### Get Kernel Info
```
GET /kernel/info
Response: { info: 'Linux ... #56-Ubuntu SMP ...' }
```

### Module Building

#### Build Module
```
POST /kernel/build
Body: { 
  code: '#include <linux/module.h>\n...', 
  moduleName: 'custom_module' 
}
Response: { 
  message: 'Module built successfully', 
  output: '...', 
  modulePath: '/path/to/custom_module.ko',
  success: true 
}
```

#### Compile & Load Module
```
POST /kernel/compile
Body: { 
  code: '#include <linux/module.h>\n...', 
  moduleName: 'custom_module',
  autoLoad: true 
}
Response: { 
  message: 'Module compiled and loaded successfully', 
  buildOutput: '...', 
  modulePath: '/path/to/custom_module.ko',
  loaded: true,
  success: true 
}
```

#### Get Module Template
```
GET /kernel/template
Response: { 
  template: '#include <linux/module.h>\n...' 
}
```

---

## 🔌 SOCKET.IO EVENTS

### Terminal Execution
```javascript
// Emit
socket.emit('terminal:execute', { command: 'ls -la', id: 1 })

// Listen
socket.on('terminal:output', (data) => {
  console.log(data.data)  // stdout
})

socket.on('terminal:error', (data) => {
  console.log(data.error)  // stderr
})

socket.on('terminal:close', (data) => {
  console.log(data.code)   // exit code
})

socket.on('terminal:timeout', (data) => {
  console.log('Command timed out')
})
```

### System Metrics
```javascript
// Start streaming
socket.emit('metrics:start')

// Listen
socket.on('metrics:update', (data) => {
  console.log(data.data)  // top output
})

// Stop streaming
socket.emit('metrics:stop')
```

### Process Monitoring
```javascript
// Start monitoring
socket.emit('process:monitor', { pid: 1234 })

// Listen
socket.on('process:update', (data) => {
  console.log(data.data)  // process info
})

// Stop monitoring
socket.emit('process:stop-monitor')
```

### Kernel Logs
```javascript
// Start streaming
socket.emit('kernel:logs-stream')

// Listen
socket.on('kernel:log', (data) => {
  console.log(data.message)  // kernel log line
})

// Stop streaming
socket.emit('kernel:stop-stream')
```

### File Watching
```javascript
// Start watching
socket.emit('files:watch', { path: '/tmp/test.txt' })

// Listen
socket.on('files:change', (data) => {
  console.log(data.event)  // file change event
})

// Stop watching
socket.emit('files:unwatch')
```

### Sessions
```javascript
// Listen for active sessions
socket.on('sessions:update', (data) => {
  console.log(data.activeCount)  // number of active clients
})
```

---

## 📝 Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error

---

## 🔄 Request/Response Examples

### Example 1: List Files
```bash
curl http://localhost:3001/api/shell/files/list?dir=/home
```

Response:
```json
{
  "files": [
    {
      "name": "user",
      "type": "directory",
      "size": 4096,
      "modified": "2024-01-01T12:00:00.000Z",
      "permissions": "755",
      "isSymlink": false
    }
  ],
  "directory": "/home",
  "count": 1
}
```

### Example 2: Execute Command
```bash
curl -X POST http://localhost:3001/api/shell/files/write \
  -H "Content-Type: application/json" \
  -d '{
    "file": "/tmp/test.txt",
    "content": "Hello World"
  }'
```

Response:
```json
{
  "message": "File written successfully",
  "file": "/tmp/test.txt"
}
```

### Example 3: Kill Process
```bash
curl -X POST http://localhost:3001/api/process/kill \
  -H "Content-Type: application/json" \
  -d '{
    "pid": 1234,
    "signal": "SIGTERM"
  }'
```

Response:
```json
{
  "message": "Process 1234 killed with signal SIGTERM"
}
```

---

## 🚀 Rate Limiting

Currently no rate limiting. For production, consider adding:
- 500 requests per 15 minutes per IP
- Implement in Express middleware

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Linux Command Reference](https://man7.org/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)

---

**Complete API Reference for Linux Dashboard v2.0**
