import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import File from '../models/fileModel.js';

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

wss.on('connection', (wsClient, request) => {
  const clientId = generateClientId();
  const clientIp = request.socket.remoteAddress;
  log(`New client: ${clientId} from ${clientIp}`);

  clientInfo.set(wsClient, { clientId, connectedAt: new Date() });
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
  const fileName = data.fileName;
  if (!fileName) {
    log(`Invalid fileName from ${clientInfo.clientId}`);
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Invalid fileName' }));
  }

  const clientSubs = clientSubscriptions.get(wsClient);
  clientSubs.add(fileName);
  if (!fileSubscriptions.has(fileName)) fileSubscriptions.set(fileName, new Set());
  fileSubscriptions.get(fileName).add(wsClient);

  const subscriberCount = fileSubscriptions.get(fileName).size;
  log(`Client ${clientInfo.clientId} joined ${fileName}. Subscribers: ${subscriberCount}`);

  let file = await File.findOne({ name: fileName });
  if (!file) {
    return wsClient.send(JSON.stringify({ 
      type: 'error', 
      message: 'File not found. Please create the file first through the main application.' 
    }));
  }

  wsClient.send(JSON.stringify({ type: 'update', fileName, content: file.content, isInitialLoad: true }));
  wsClient.send(JSON.stringify({ type: 'joinConfirm', fileName, subscriberCount }));
}

async function handleUpdateFile(wsClient, data, clientInfo) {
  const { fileName, content } = data;
  if (!fileName || content === undefined) {
    log(`Invalid update from ${clientInfo.clientId}`);
    return wsClient.send(JSON.stringify({ type: 'error', message: 'Invalid fileName or content' }));
  }

  log(`Update for ${fileName} from ${clientInfo.clientId} (${content.length} chars)`);
  await File.findOneAndUpdate({ name: fileName }, { content, lastModified: Date.now() }, { upsert: true });

  if (fileSubscriptions.has(fileName)) {
    const subscribers = fileSubscriptions.get(fileName);
    let broadcastCount = 0;
    subscribers.forEach((client) => {
      if (client !== wsClient && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'update', fileName, content, senderId: clientInfo.clientId, timestamp: Date.now() }));
        broadcastCount++;
      }
    });
    log(`Broadcasted update to ${broadcastCount} subscribers`);
  }
}

async function handleGetContent(wsClient, data, clientInfo) {
  const { fileName } = data;
  log(`Content request for ${fileName} from ${clientInfo.clientId}`);
  const file = await File.findOne({ name: fileName });
  wsClient.send(JSON.stringify({ type: 'update', fileName, content: file?.content || '', isResponse: true }));
}

function handleClientDisconnect(wsClient) {
  const info = clientInfo.get(wsClient);
  const clientSubs = clientSubscriptions.get(wsClient) || new Set();
  clientSubs.forEach(fileName => {
    if (fileSubscriptions.has(fileName)) {
      fileSubscriptions.get(fileName).delete(wsClient);
      if (fileSubscriptions.get(fileName).size === 0) fileSubscriptions.delete(fileName);
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