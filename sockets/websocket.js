// websocket.js
import { WebSocketServer } from "ws";

const rooms = new Map(); // roomId -> { content, clients, invitedEmails }

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      const data = JSON.parse(message);

      if (data.type === "join") {
        const room = rooms.get(data.roomId) || {
          content: "// Start coding here...",
          clients: new Set(),
          invitedEmails: new Set()
        };
        room.clients.add(ws);
        rooms.set(data.roomId, room);
        ws.send(
          JSON.stringify({
            type: "update",
            roomId: data.roomId,
            content: room.content,
          })
        );
        broadcastCollaborators(data.roomId);
      } else if (data.type === "getContent") {
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
        const room = rooms.get(data.roomId);
        if (room) {
          room.invitedEmails.add(data.email);
          // Notify all clients about new invite
          room.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "invite",
                email: data.email,
                roomId: data.roomId
              }));
            }
          });
        }
      } else if (data.type === "update") {
        const room = rooms.get(data.roomId);
        if (room) {
          room.content = data.content;
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
      }
    });

    ws.on("close", () => {
      rooms.forEach((room, roomId) => {
        if (room.clients.has(ws)) {
          room.clients.delete(ws);
          broadcastCollaborators(roomId);
        }
      });
    });
  });
}

function broadcastCollaborators(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    const collaboratorCount = room.clients.size;
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
