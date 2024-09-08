let ws;
let pingInterval;
const API_KEY = import.meta.env.PUBLIC_API_KEY;

function setupWebSocket(handleRealtimeUpdate) {
    const wsUrl = `${import.meta.env.PUBLIC_WS_URL}?apiKey=${API_KEY}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type !== 'pong') {
                handleRealtimeUpdate(message);
            }
        } catch (error) {
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = (event) => {
        clearInterval(pingInterval);
    };
}

function getWebSocket() {
    return ws;
}

function closeWebSocket() {
    if (ws) {
        ws.close();
    }
}

export { setupWebSocket, getWebSocket, closeWebSocket };