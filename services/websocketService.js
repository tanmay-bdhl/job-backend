const WebSocket = require('ws');
const AnalysisEvent = require('../models/AnalysisEvent');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.subscriptions = new Map();
  }

  initialize(port = 8080) {
    this.wss = new WebSocket.Server({ port, perMessageDeflate: false });
    console.log(`🔌 WebSocket server running on port ${port}`);

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('[WS][SERVER][ERROR]', error.message);
    });
  }

  handleConnection(ws, req) {
    console.log(`[WS] New connection from ${req.socket.remoteAddress}`);
    
    ws.subscriptions = new Set();
    
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (error) => this.handleError(ws, error));

    this.send(ws, {
      type: 'connected',
      message: 'WebSocket connected successfully',
      timestamp: new Date().toISOString()
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      this.processMessage(ws, data);
    } catch (error) {
      console.error('[WS][MESSAGE][ERROR]', error.message);
      this.sendError(ws, 'Invalid JSON message');
    }
  }

  handleDisconnect(ws) {
    console.log('[WS] Connection closed');
    this.removeClient(ws);
  }

  handleError(ws, error) {
    console.error('[WS][ERROR]', error.message);
    this.removeClient(ws);
  }

  processMessage(ws, data) {
    const { type, analysisId } = data;
    
    switch (type) {
      case 'start_analysis':
      case 'subscribe': 
        this.subscribe(ws, analysisId);
        break;
      case 'stop_analysis':
      case 'unsubscribe': 
        this.unsubscribe(ws, analysisId);
        break;
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  subscribe(ws, analysisId) {
    if (!analysisId) {
      this.sendError(ws, 'analysisId is required');
      return;
    }

    if (!this.subscriptions.has(analysisId)) {
      this.subscriptions.set(analysisId, new Set());
    }
    
    this.subscriptions.get(analysisId).add(ws);
    ws.subscriptions.add(analysisId);

    console.log(`[WS] Client subscribed to analysis: ${analysisId}`);

    this.sendCurrentStatus(ws, analysisId);
    this.send(ws, {
      type: 'subscribed',
      analysisId,
      timestamp: new Date().toISOString()
    });
  }

  unsubscribe(ws, analysisId) {
    if (this.subscriptions.has(analysisId)) {
      this.subscriptions.get(analysisId).delete(ws);
      if (this.subscriptions.get(analysisId).size === 0) {
        this.subscriptions.delete(analysisId);
      }
    }

    ws.subscriptions.delete(analysisId);
    console.log(`[WS] Client unsubscribed from analysis: ${analysisId}`);

    this.send(ws, {
      type: 'unsubscribed',
      analysisId,
      timestamp: new Date().toISOString()
    });
  }

  removeClient(ws) {
    if (ws.subscriptions) {
      ws.subscriptions.forEach(analysisId => {
        if (this.subscriptions.has(analysisId)) {
          this.subscriptions.get(analysisId).delete(ws);
          if (this.subscriptions.get(analysisId).size === 0) {
            this.subscriptions.delete(analysisId);
          }
        }
      });
    }
  }

  async sendCurrentStatus(ws, analysisId) {
    try {
      const analysisEvent = await AnalysisEvent.findOne({ analysisId });
      if (analysisEvent) {
        this.send(ws, {
          type: 'status_update',
          analysisId: analysisEvent.analysisId,
          status: analysisEvent.status,
          progress: analysisEvent.progress,
          currentStage: analysisEvent.currentStage,
          timestamp: analysisEvent.updatedAt.toISOString(),
          error: analysisEvent.error
        });
      }
    } catch (error) {
      console.error('[WS][STATUS][ERROR]', error.message);
    }
  }

  broadcastStatusUpdate(analysisId, statusData) {
    if (!this.subscriptions.has(analysisId)) {
      console.log(`[WS] No subscribers for analysis: ${analysisId}`);
      return;
    }

    const message = {
      type: 'status_update',
      analysisId,
      ...statusData,
      timestamp: new Date().toISOString()
    };

    const subscribers = this.subscriptions.get(analysisId);
    const deadConnections = new Set();

    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      } else {
        deadConnections.add(ws);
      }
    });

    deadConnections.forEach(ws => {
      subscribers.delete(ws);
    });

    if (subscribers.size === 0) {
      this.subscriptions.delete(analysisId);
    }

    console.log(`[WS] Broadcasted to ${subscribers.size} clients for ${analysisId}`);
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WS][SEND][ERROR]', error.message);
      }
    }
  }

  sendError(ws, errorMessage) {
    this.send(ws, {
      type: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  getStats() {
    const totalConnections = this.wss ? this.wss.clients.size : 0;
    const activeSubscriptions = this.subscriptions.size;
    const totalSubscribers = Array.from(this.subscriptions.values())
      .reduce((sum, subscribers) => sum + subscribers.size, 0);

    return {
      totalConnections,
      activeSubscriptions,
      totalSubscribers
    };
  }

  shutdown() {
    if (this.wss) {
      console.log('[WS] Shutting down WebSocket server...');
      
      this.wss.clients.forEach(ws => {
        ws.close(1001, 'Server shutting down');
      });

      this.wss.close(() => {
        console.log('[WS] WebSocket server closed');
      });
    }
  }
}

const websocketService = new WebSocketService();
module.exports = websocketService;