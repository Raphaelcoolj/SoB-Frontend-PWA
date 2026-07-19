import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

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

// Online user tracking
const onlineUserIds = new Set<string>();

export const isOnline = (userId: string) => onlineUserIds.has(userId);

let listenersRegistered = false;

/**
 * Helper to connect socket with authentication token.
 * @param token - JWT access token
 */
export const connectSocket = (token: string) => {
  socket.auth = { token };

  if (socket.connected) return;
  socket.connect();

  if (!listenersRegistered) {
    socket.on('user:online', (userId: string) => onlineUserIds.add(userId));
    socket.on('user:offline', (userId: string) => onlineUserIds.delete(userId));

    socket.on('connect_error', (err) => {
      if (err.message?.includes('Authentication')) {
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
          socket.auth = { token: accessToken };
          if (!socket.connected) socket.connect();
        }
      }
    });

    listenersRegistered = true;
  }
};

/**
 * Helper to disconnect socket.
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
