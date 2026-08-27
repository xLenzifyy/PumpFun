/**
 * Mayhem Bot - Node.js WebSocket Relay Server
 * Run: npm install ws
 * Start: node server.js
 */

import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;
const UPSTREAM_WS_URL = 'wss://stream.pumpapi.io/';

// Create WebSocket server for browser clients
const wss = new WebSocketServer({ port: PORT });
console.log(`[RELAY SERVER] Listening on port ${PORT}`);

let upstreamWs = null;
const clientSockets = new Set();

function connectUpstream() {
  console.log(`[RELAY SERVER] Connecting to upstream: ${UPSTREAM_WS_URL}`);
  
  upstreamWs = new WebSocket(UPSTREAM_WS_URL);

  upstreamWs.on('open', () => {
    console.log('[RELAY SERVER] Connected to PumpAPI stream successfully.');
  });

  upstreamWs.on('message', (rawData) => {
    // Broadcast data to all connected browser extension tabs
    for (const client of clientSockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(rawData.toString());
      }
    }
  });

  upstreamWs.on('error', (err) => {
    console.error('[RELAY SERVER] Upstream error:', err.message);
  });

  upstreamWs.on('close', () => {
    console.warn('[RELAY SERVER] Upstream connection closed. Reconnecting in 3s...');
    setTimeout(connectUpstream, 3000);
  });
}

// Handle client connections from your Chrome extension
wss.on('connection', (ws) => {
  console.log('[RELAY SERVER] Chrome Extension client connected.');
  clientSockets.add(ws);

  // Forward any commands/subscriptions from the browser up to the stream
  ws.on('message', (msg) => {
    if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
      upstreamWs.send(msg.toString());
    }
  });

  ws.on('close', () => {
    console.log('[RELAY SERVER] Chrome Extension client disconnected.');
    clientSockets.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[RELAY SERVER] Client socket error:', err.message);
    clientSockets.delete(ws);
  });
});

// Start upstream link
connectUpstream();
