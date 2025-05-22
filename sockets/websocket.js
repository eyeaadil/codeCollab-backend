// websocket.js
import { WebSocketServer } from "ws";

const rooms = new Map(); // roomId -> { content, clients, invitedEmails }

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log('Backend: New WebSocket client connected');

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Backend: Received message: ${JSON.stringify(data)}`);

        if (!data || typeof data !== 'object') {
          console.error('Backend: Received invalid message data:', data);
          return; // Ignore invalid messages
        }

        console.log(`Backend: Message type: ${data.type}`);

        if (data.type === "join") {
          console.log(`Backend: Handling join message for roomId: ${data.roomId}`);
          const room = rooms.get(data.roomId) || {
            content: "// Start coding here...",
            clients: new Set(),
            invitedEmails: new Set()
          };
          room.clients.add(ws);
          rooms.set(data.roomId, room);
          console.log(`Backend: Client joined room: ${data.roomId}. Current clients in room: ${room.clients.size}`);
          // Send initial content to the joining client
          ws.send(
            JSON.stringify({
              type: "update",
              roomId: data.roomId,
              content: room.content,
            })
          );
          broadcastCollaborators(data.roomId);

        } else if (data.type === "getContent") {
           console.log(`Backend: Handling getContent message for roomId: ${data.roomId}`);
          const room = rooms.get(data.roomId);
          if (room) {
            ws.send(
              JSON.stringify({
                type: "update",
                roomId: data.roomId,
                content: room.content,
              })
            );
          }
        } else if (data.type === "invite") {
           console.log(`Backend: Handling invite message for roomId: ${data.roomId}, email: ${data.email}`);
          const room = rooms.get(data.roomId);
          if (room) {
            room.invitedEmails.add(data.email);
            console.log(`Backend: Client invited ${data.email} to room ${data.roomId}`);
            // Notify all clients about new invite
            room.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ ...data, type: "invite" })); // Send original data including roomId and email
              }
            });
          }
        } else if (data.type === "update") {
          console.log(`Backend: Handling update message for roomId: ${data.roomId}`);
          const room = rooms.get(data.roomId);
          if (room) {
            room.content = data.content;
            console.log(`Backend: Received update for room ${data.roomId}. New content length: ${data.content ? data.content.length : 0}`);
            room.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "update",
                    roomId: data.roomId,
                    content: data.content,
                    clientId: data.clientId,
                  })
                );
              }
            });
          }
        } else {
           console.log(`Backend: Received unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Backend: Error processing message:', error);
        // Consider closing the connection or sending an error back to the client
        // ws.close(1008, 'Error processing message');
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`Backend: Client disconnected. Code: ${code}, Reason: ${reason}`);
      rooms.forEach((room, roomId) => {
        if (room.clients.has(ws)) {
          room.clients.delete(ws);
          console.log(`Backend: Client removed from room: ${roomId}. Remaining clients: ${room.clients.size}`);
          if (room.clients.size === 0) {
             rooms.delete(roomId);
             console.log(`Backend: Room ${roomId} is now empty and deleted.`);
          }
          broadcastCollaborators(roomId);
        } else {
           // This case should ideally not happen if client was properly tracked
           console.warn(`Backend: Disconnecting client not found in room ${roomId}'s clients.`);
        }
      });
    });

    ws.on('error', (error) => {
        console.error('Backend: WebSocket error:', error);
    });
  });
}

function broadcastCollaborators(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    const collaboratorCount = room.clients.size;
    console.log(`Backend: Broadcasting collaborators for room ${roomId}. Count: ${collaboratorCount}`);
    room.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "collaborators",
            collaborators: Array.from(room.clients).length,
            invitedEmails: Array.from(room.invitedEmails)
          })
        );
      }
    });
  }
}

export { setupWebSocket };
