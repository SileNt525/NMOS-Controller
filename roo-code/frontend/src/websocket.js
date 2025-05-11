export default class WebSocketClient {
  constructor(url) {
    this.url = url || process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5000/ws';
    this.ws = null;
    this.reconnectInterval = 5000; // 5秒重连间隔
    this.onMessageCallback = null;
    this.onOpenCallback = null;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = (event) => {
      console.log('WebSocket连接已建立');
      if (this.onOpenCallback) {
        this.onOpenCallback(event);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket连接已关闭', event);
      if (this.onCloseCallback) {
        this.onCloseCallback(event);
      }
      // 尝试重连
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  onOpen(callback) {
    this.onOpenCallback = callback;
  }

  onClose(callback) {
    this.onCloseCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket未连接，无法发送消息');
    }
  }
}