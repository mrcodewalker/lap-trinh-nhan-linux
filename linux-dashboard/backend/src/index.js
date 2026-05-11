/**
 * Linux Dashboard - Main Server Entry Point
 * Cyberpunk Linux System Programming Dashboard
 * No Auth - Direct System Access
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');

// Routes
const shellRoutes = require('./routes/shell');
const processRoutes = require('./routes/process');
const kernelRoutes = require('./routes/kernel');

// Socket handlers
const { initSocketHandlers } = require('./socket/socketManager');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes - 3 Main Modules
app.use('/api/shell', shellRoutes);
app.use('/api/process', processRoutes);
app.use('/api/kernel', kernelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    modules: ['shell', 'process', 'kernel']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize Socket.IO handlers
initSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`🚀 Linux Dashboard Backend running on port ${PORT}`);
  logger.info(`🔌 Socket.IO ready`);
  logger.info(`📦 Modules: Shell | Process | Kernel`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
