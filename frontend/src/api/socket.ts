import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    console.log('[Socket] Ya conectado, reutilizando conexión:', socket?.id);
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    extraHeaders: {
      'bypass-tunnel-reminder': 'true',
    },
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Conectado exitosamente:', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] ❌ Desconectado:', reason);
  });

  socket.on('reconnect', () => {
    console.log('[Socket] 🔄 Reconectado:', socket?.id);
    // Nota: ChatScreen re-emitirá join_conversation cuando el useEffect se ejecute
  });

  socket.on('reconnect_attempt', () => {
    console.log('[Socket] 🔄 Intentando reconectar...');
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[Socket] ❌ Error de conexión:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    console.log('[Socket] 🛑 Desconectando socket');
    socket.disconnect();
    socket = null;
  }
};
