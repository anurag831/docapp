const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const authRoutes = require('./routes/auth');
const documentsRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);

// In production, serve client/dist as static files and handle SPA fallback
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// In-memory document rooms presence storage:
// docId -> Map<userId, { name, role, isTyping, lastActive, ws }>
const documentRooms = new Map();

function broadcastPresence(docId) {
  const room = documentRooms.get(docId);
  if (!room) return;

  const presenceList = [];
  for (const [userId, user] of room.entries()) {
    presenceList.push({
      userId,
      name: user.name,
      role: user.role,
      isTyping: !!user.isTyping,
      lastActive: user.lastActive,
    });
  }

  const message = JSON.stringify({
    type: 'presence_state',
    docId,
    collaborators: presenceList,
  });

  for (const user of room.values()) {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  }
}

function broadcastToRoom(docId, data, excludeUserId = null) {
  const room = documentRooms.get(docId);
  if (!room) return;

  const message = JSON.stringify(data);
  for (const [userId, user] of room.entries()) {
    if (excludeUserId && userId === excludeUserId) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  }
}

wss.on('connection', (ws) => {
  let currentDocId = null;
  let currentUserId = null;

  ws.on('message', (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage);

      if (data.type === 'join') {
        const { docId, userId, name, role } = data;
        if (!docId || !userId) return;

        currentDocId = docId;
        currentUserId = userId;

        if (!documentRooms.has(docId)) {
          documentRooms.set(docId, new Map());
        }

        const room = documentRooms.get(docId);
        room.set(userId, {
          name: name || 'Anonymous',
          role: role || 'viewer',
          isTyping: false,
          lastActive: Date.now(),
          ws,
        });

        broadcastPresence(docId);
      } else if (data.type === 'typing') {
        if (!currentDocId || !currentUserId) return;
        const room = documentRooms.get(currentDocId);
        if (room && room.has(currentUserId)) {
          const user = room.get(currentUserId);
          user.isTyping = !!data.isTyping;
          user.lastActive = Date.now();
          broadcastPresence(currentDocId);
        }
      } else if (data.type === 'doc_saved') {
        if (!currentDocId) return;
        broadcastToRoom(
          currentDocId,
          {
            type: 'doc_updated',
            docId: currentDocId,
            updatedBy: data.updatedBy || 'A collaborator',
            timestamp: Date.now(),
          },
          currentUserId
        );
      } else if (data.type === 'heartbeat') {
        if (!currentDocId || !currentUserId) return;
        const room = documentRooms.get(currentDocId);
        if (room && room.has(currentUserId)) {
          room.get(currentUserId).lastActive = Date.now();
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  const cleanup = () => {
    if (currentDocId && currentUserId) {
      const room = documentRooms.get(currentDocId);
      if (room) {
        room.delete(currentUserId);
        if (room.size === 0) {
          documentRooms.delete(currentDocId);
        } else {
          broadcastPresence(currentDocId);
        }
      }
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

app.server = server;
module.exports = app;
