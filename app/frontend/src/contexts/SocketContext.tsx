import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, SocketContextType } from '../types';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { toast } from 'react-toastify';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, tenant } = useAuth();
  const { currentTenant } = useTenant();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user && currentTenant) {
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:5000', {
        auth: {
          token: localStorage.getItem('accessToken'),
        },
        transports: ['websocket', 'polling'],
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection handlers
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);

        // Authenticate with tenant
        newSocket.emit('authenticate', {
          token: localStorage.getItem('accessToken'),
          tenantId: currentTenant.id,
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
        toast.success('Real-time connection established');
      });

      newSocket.on('auth_error', (error) => {
        console.error('Socket auth error:', error);
        toast.error('Real-time connection failed');
      });

      // Notification handlers
      newSocket.on('booking_created', (notification) => {
        handleNotification(notification);
      });

      newSocket.on('booking_cancelled', (notification) => {
        handleNotification(notification);
      });

      newSocket.on('inventory_updated', (notification) => {
        handleNotification(notification);
      });

      newSocket.on('payment_processed', (notification) => {
        handleNotification(notification);
      });

      newSocket.on('system_notification', (notification) => {
        handleNotification(notification);
      });

      newSocket.on('channel_sync', (notification) => {
        handleNotification(notification);
      });

      return () => {
        newSocket.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [user, currentTenant]);

  const handleNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50

    // Show toast notification for important alerts
    if (notification.priority === 'high') {
      toast.info(`${notification.title}: ${notification.message}`, {
        autoClose: 8000,
      });
    }
  };

  const sendNotification = (notificationData: Omit<Notification, 'id' | 'tenantId' | 'createdAt'>) => {
    if (socket && isConnected) {
      socket.emit('send_notification', {
        ...notificationData,
        tenantId: currentTenant?.id,
      });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    notifications,
    sendNotification,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
