const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Backrooms WebSocket server');
});

const wss = new WebSocket.Server({ noServer: true });

const rooms = new Map(); // roomCode -> Set of ws

function makeSeed() { return Math.floor(Math.random() * 0xFFFFFFFF); }

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'ping') {
      try { ws.send(JSON.stringify({ type: 'pong' })); } catch (e) {}
      return;
    }

    if (msg.type === 'join') {
      const roomCode = String(msg.roomCode || 'ROOM');
      const mode = msg.mode || 'normal';
      const waters = msg.waters || 3;

      let room = rooms.get(roomCode);
      if (!room) { room = new Set(); rooms.set(roomCode, room); }
      room.add(ws);
      ws.roomCode = roomCode;

      // Send init with deterministic seed and simple info
      const init = {
        type: 'init',
        seed: makeSeed(),
        mode,
        waters,
        players: room.size
      };
      try { ws.send(JSON.stringify(init)); } catch (e) {}

      // notify others
      for (const other of room) {
        if (other !== ws && other.readyState === WebSocket.OPEN) {
          try { other.send(JSON.stringify({ type: 'player-joined' })); } catch (e) {}
        }
      }
      return;
    }

    // Broadcast other messages to room peers
    const room = rooms.get(ws.roomCode);
    if (room) {
      for (const other of room) {
        if (other !== ws && other.readyState === WebSocket.OPEN) {
          try { other.send(JSON.stringify(msg)); } catch (e) {}
        }
      }
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    if (room) { room.delete(ws); if (room.size === 0) rooms.delete(ws.roomCode); }
  });
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// Simple ping to detect dead peers
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 30000);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Backrooms WS listening on ${port}`));
