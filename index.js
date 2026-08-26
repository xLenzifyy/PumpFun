import { WebSocketServer, WebSocket } from 'ws';

// Bind to the port provided by your host (e.g., Render/Railway) or default to 8765
const PORT = process.env.SERVER_PORT || 8765;

// Create the WebSocket server that your users' extensions will connect to
const localWss = new WebSocketServer({ host: '0.0.0.0', port: PORT });
let pumpApiWs = null;

console.log(`[RELAY] Host Server active and listening on port ${PORT}`);

function connectPumpApi() {
    console.log('[RELAY] Connecting to PumpAPI upstream...');
    
    // Connect to the secure PumpAPI stream as a Node backend (bypasses browser CORS/1008 blocks)
    // Connect to PumpAPI with spoofed browser headers to bypass their firewall
    pumpApiWs = new WebSocket('wss://stream.pumpapi.io/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Origin': 'https://pump.fun',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        }
    });

    pumpApiWs.on('open', () => {
        console.log('[RELAY] Connected to PumpAPI stream successfully!');
    });

    pumpApiWs.on('message', (data) => {
        const messageStr = data.toString();
        
        // Broadcast the incoming event to EVERY connected user extension
        let activeClients = 0;
        localWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
                activeClients++;
            }
        });
        
        // Optional: Log how many clients are receiving the data
        // console.log(`[RELAY] Broadcasted event to ${activeClients} users.`);
    });

    pumpApiWs.on('error', (err) => {
        console.error('[RELAY ERROR]', err.message);
    });

    pumpApiWs.on('close', () => {
        console.log('[RELAY WARNING] PumpAPI disconnected. Reconnecting in 3 seconds...');
        setTimeout(connectPumpApi, 3000);
    });
}

// Start the upstream connection
connectPumpApi();

// Handle incoming user connections for logging
localWss.on('connection', (socket) => {
    console.log(`[RELAY] New user extension connected! Total users: ${localWss.clients.size}`);
    
    socket.on('close', () => {
        console.log(`[RELAY] User disconnected. Total users: ${localWss.clients.size}`);
    });
});
