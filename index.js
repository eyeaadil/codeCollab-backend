import express from 'express';
import { createServer } from 'http';
import connectDB from './config/dbConnect.js';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import bodyParser from 'body-parser';
// import inviteRoutes from './routes/inviteRoutes.js';
import collaborateRoutes from './routes/collaborateRoutes.js';
// Import the WebSocket server to ensure it starts
import './sockets/websocket.js';

dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' })); // Increase limit for large code files
app.use(cookieParser());

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'], // Add common React dev server ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:8080');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      express: 'running',
      websocket: 'running on port 4000'
    }
  });
});

// Use Routes
app.use('/api/auth', authRoutes);
// app.use('/api/collaborate', inviteRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/collaborate', collaborateRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Real-time Code Editor API is running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      collaborate: '/api/collaborate',
      folders: '/api/folders',
      files: '/api/files'
    },
    websocket: 'ws://localhost:4000'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Start Express Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log(`📡 WebSocket server running on port 4000`);
  console.log(`🌐 CORS enabled for: http://localhost:8080, http://localhost:3000`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;