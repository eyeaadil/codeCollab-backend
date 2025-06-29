// websocket.js
import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import Room from '../models/roomModel.js';
import { parseToken } from '../utils/token-utils.js';
import url from 'url';

const wss = new WebSocketServer({ port: 4000, perMessageDeflate: false, maxPayload: 100 * 1024 * 1024 });

const fileSubscriptions = new Map();
const clientSubscriptions = new Map();
const clientInfo = new Map();

function generateClientId() {
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function heartbeat() {
  this.isAlive = true;
}

function log(message, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] WS(4000): ${message}`);
  if (data) console.log(`[${timestamp}] WS(4000): Data:`, JSON.stringify(data, null, 2));
}

wss.on('connection', async (wsClient, request) => {
  const clientId = generateClientId();
  const clientIp = request.socket.remoteAddress;

  // Parse token from query parameters
  const query = url.parse(request.url, true).query;
  const token = query.token;
  let userId;

  try {
    userId = parseToken(token);
  } catch (error) {
    log(`Authentication failed for ${clientId}: ${error.message}`);
    wsClient.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Invalid token' }));
    wsClient.close(4001, 'Unauthorized');
    return;
  }

  log(`New client: ${clientId} (user: ${userId}) from ${clientIp}`);
  clientInfo.set(wsClient, { clientId, userId, connectedAt: new Date() });
  wsClient.isAlive = true;
  wsClient.on('pong', heartbeat);
  clientSubscriptions.set(wsClient, new Set());

  wsClient.send(JSON.stringify({ type: 'welcome', clientId, message: 'Connected to WebSocket server' }));

  wsClient.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const info = clientInfo.get(wsClient);
      log(`Received from ${info.clientId}:`, data);

      if (data.type === 'join') await handleJoinFile(wsClient, data, info);
      else if (data.type === 'update') await handleUpdateFile(wsClient, data, info);
      else if (data.type === 'getContent') await handleGetContent(wsClient, data, info);
      else log(`Unknown message type: ${data.type}`);
    } catch (error) {
      log(`Error processing message: ${error.message}`);
      wsClient.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  wsClient.on('close', (code, reason) => {
    const info = clientInfo.get(wsClient);
    log(`Client disconnected: ${info?.clientId} (code: ${code}, reason: ${reason})`);
    handleClientDisconnect(wsClient);
  });

  wsClient.on('error', (error) => {
    const info = clientInfo.get(wsClient);
    log(`WebSocket error for ${info?.clientId}: ${error.message}`);
  });
});

async function handleJoinFile(wsClient, data, clientInfo) {
  const { roomId } = data; // Changed from fileName to roomId
  if (!roomId) {
    log(`Invalid roomId from ${clientInfo.clientId}`);
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Invalid roomId' }));
  }

  // Validate room and user access
  const room = await Room.findOne({ roomId }).populate('creator invitedUsers');
  if (!room) {
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Room not found or expired' }));
  }
  if (room.creator._id.toString() !== clientInfo.userId && !room.invitedUsers.some(u => u._id.toString() === clientInfo.userId)) {
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Not invited to this room' }));
  }

  const clientSubs = clientSubscriptions.get(wsClient);
  clientSubs.add(roomId);
  if (!fileSubscriptions.has(roomId)) fileSubscriptions.set(roomId, new Set());
  fileSubscriptions.get(roomId).add(wsClient);

  const subscriberCount = fileSubscriptions.get(roomId).size;
  log(`Client ${clientInfo.clientId} joined ${roomId}. Subscribers: ${subscriberCount}`);

  // No longer checking for separate File model, content is stored in Room
  wsClient.send(JSON.stringify({ type: 'update', roomId, content: room.content, isInitialLoad: true }));
  wsClient.send(JSON.stringify({ type: 'joinConfirm', roomId, subscriberCount }));
}

async function handleUpdateFile(wsClient, data, clientInfo) {
  const { roomId, content } = data; // Changed from fileName to roomId
  if (!roomId || content === undefined) {
    log(`Invalid update from ${clientInfo.clientId}`);
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Invalid roomId or content' }));
  }

  const room = await Room.findOne({ roomId });
  if (!room) {
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Room not found or expired' }));
  }

  log(`Update for ${roomId} from ${clientInfo.clientId} (${content.length} chars)`);
  // Update content directly in the Room model
  await Room.findOneAndUpdate({ roomId }, { content, lastModified: Date.now() }, { new: true });

  if (fileSubscriptions.has(roomId)) {
    const subscribers = fileSubscriptions.get(roomId);
    let broadcastCount = 0;
    subscribers.forEach((client) => {
      if (client !== wsClient && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'update', roomId, content, senderId: clientInfo.clientId, timestamp: Date.now() }));
        broadcastCount++;
      }
    });
    log(`Broadcasted update to ${broadcastCount} subscribers`);
  }
}

async function handleGetContent(wsClient, data, clientInfo) {
  const { roomId } = data; // Changed from fileName to roomId
  const room = await Room.findOne({ roomId });
  if (!room) {
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Room not found or expired' }));
  }

  log(`Content request for ${roomId} from ${clientInfo.clientId}`);
  // Get content directly from the Room model
  wsClient.send(JSON.stringify({ type: 'update', roomId, content: room.content || '', isResponse: true }));
}

function handleClientDisconnect(wsClient) {
  const info = clientInfo.get(wsClient);
  const clientSubs = clientSubscriptions.get(wsClient) || new Set();
  clientSubs.forEach(roomId => {
    if (fileSubscriptions.has(roomId)) {
      fileSubscriptions.get(roomId).delete(wsClient);
      if (fileSubscriptions.get(roomId).size === 0) fileSubscriptions.delete(roomId);
    }
  });
  clientSubscriptions.delete(wsClient);
  clientInfo.delete(wsClient);
}

const interval = setInterval(() => {
  wss.clients.forEach(client => {
    if (client.isAlive === false) {
      const info = clientInfo.get(client);
      log(`Terminating dead connection: ${info?.clientId}`);
      handleClientDisconnect(client);
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
  log('WebSocket server closed');
});

setInterval(() => {
  log(`Stats: ${wss.clients.size} clients, ${fileSubscriptions.size} active subscriptions`);
}, 60000);

log('WebSocket server started on port 4000');