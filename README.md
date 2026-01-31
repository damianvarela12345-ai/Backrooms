# Backrooms

## WebSocket server (Render)

This repo now includes a small WebSocket server in `/server` intended to run as a separate Render service.

- Start locally: cd server && npm install && npm start
- Messages: `join` (body: { roomCode, mode, waters }) → server replies `init` with `seed` and `players` count. Server forwards other messages to peers in the same room and responds to `ping` with `pong`.

Client configuration:

- The multiplayer menu has an optional **Server Host** field (`#mp-server`). If left blank the client connects to the current host.
- You can also set a global override in the browser before connecting for automated environments: `window.WS_HOST = 'wss://your-ws-host.example.com'`.

Render manifest (`render.yaml`) was updated to add a second web service `BackroomsWS` with `startCommand: node server/index.js`. The static game remains on the `BackroomsVisualscape` static service.
