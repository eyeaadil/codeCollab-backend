import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import connectDB from './config/dbConnect.js';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import bodyParser from 'body-parser';
import { setupWebSocket } from './sockets/websocket.js';
import inviteRoutes from './routes/inviteRoutes.js';

dotenv.config();

// Initialize Express app and HTTP server
const app = express(); 
const server = createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Check WebSocket server status
wss.on('listening', () => {
  console.log('WebSocket Server is running');
});

wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

// Track connected clients
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Setup WebSocket
setupWebSocket(wss);

// Use Routes
app.use('/api/auth', authRoutes);
// app.use('/api/collaborate', collaborationRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/collaborate', inviteRoutes);
// Example route
app.get('/', (req, res) => res.send('API is running'));

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));