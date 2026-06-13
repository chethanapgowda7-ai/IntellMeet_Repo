import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  getSocket() {
    if (!this.socket) {
      this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        forceNew: true,
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
