import { io, Socket } from 'socket.io-client';

/**
 * @file socket.ts
 * @description Singleton Socket.io client instance.
 * Connects to the backend and manages real-time communication.
 */

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

/**
 * Helper to connect socket with authentication token.
 * @param token - JWT access token
 */
export const connectSocket = (token: string) => {
  if (socket.connected) return;
  
  socket.auth = { token };
  socket.connect();
};

/**
 * Helper to disconnect socket.
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
