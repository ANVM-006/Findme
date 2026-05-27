import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    extraHeaders: {
      'bypass-tunnel-reminder': 'true',
    },
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err: Error) => {
    console.log('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
