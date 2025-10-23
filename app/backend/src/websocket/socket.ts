import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data: { token: string, tenantId: string }) => {
        try {
          // Verify JWT token and get user info
          const user = await this.verifyToken(data.token);
          if (user) {
            this.connectedUsers.set(user.id, socket.id);
            socket.join(`tenant_${data.tenantId}`);
            socket.join(`user_${user.id}`);
            
            socket.emit('authenticated', { 
              userId: user.id, 
              tenantId: data.tenantId,
              message: 'Successfully authenticated' 
            });
            
            logger.info(`User authenticated: ${user.id} for tenant ${data.tenantId}`);
          } else {
            socket.emit('auth_error', { message: 'Invalid token' });
          }
        } catch (error) {
          logger.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle room joins
      socket.on('join_room', (room: string) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room: ${room}`);
      });

      // Handle room leaves
      socket.on('leave_room', (room: string) => {
        socket.leave(room);
        logger.info(`Socket ${socket.id} left room: ${room}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove user from connected users
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            break;
          }
        }
        
        logger.info(`User disconnected: ${socket.id}`);
      });
    });
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      // This would normally verify JWT token
      // For now, return a mock user
      return { id: 'user_123', email: 'test@example.com' };
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  // Send notification to specific user
  public sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.info(`Sent ${event} to user ${userId}`);
    }
  }

  // Send notification to all users in a tenant
  public sendToTenant(tenantId: string, event: string, data: any): void {
    this.io.to(`tenant_${tenantId}`).emit(event, data);
    logger.info(`Sent ${event} to tenant ${tenantId}`);
  }

  // Send notification to specific room
  public sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
    logger.info(`Sent ${event} to room ${room}`);
  }

  // Broadcast to all connected users
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    logger.info(`Broadcasted ${event} to all users`);
  }

  // Send booking notification
  public sendBookingNotification(tenantId: string, bookingData: any): void {
    this.sendToTenant(tenantId, 'booking_created', {
      type: 'booking',
      title: 'New Booking',
      message: `New booking ${bookingData.bookingReference} has been created`,
      data: bookingData
    });
  }

  // Send booking cancellation notification
  public sendBookingCancellationNotification(tenantId: string, bookingData: any): void {
    this.sendToTenant(tenantId, 'booking_cancelled', {
      type: 'booking_cancellation',
      title: 'Booking Cancelled',
      message: `Booking ${bookingData.bookingReference} has been cancelled`,
      data: bookingData
    });
  }

  // Send inventory update notification
  public sendInventoryUpdateNotification(tenantId: string, inventoryData: any): void {
    this.sendToTenant(tenantId, 'inventory_updated', {
      type: 'inventory',
      title: 'Inventory Updated',
      message: `Inventory has been updated for ${inventoryData.propertyName}`,
      data: inventoryData
    });
  }

  // Send payment notification
  public sendPaymentNotification(tenantId: string, paymentData: any): void {
    this.sendToTenant(tenantId, 'payment_processed', {
      type: 'payment',
      title: 'Payment Processed',
      message: `Payment ${paymentData.paymentReference} has been processed`,
      data: paymentData
    });
  }

  // Send system notification
  public sendSystemNotification(tenantId: string, notificationData: any): void {
    this.sendToTenant(tenantId, 'system_notification', {
      type: 'system',
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData
    });
  }

  // Send channel sync notification
  public sendChannelSyncNotification(tenantId: string, channelData: any): void {
    this.sendToTenant(tenantId, 'channel_sync', {
      type: 'channel_sync',
      title: 'Channel Sync',
      message: `Channel ${channelData.channelName} sync completed`,
      data: channelData
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users for tenant
  public getTenantConnectedUsers(tenantId: string): string[] {
    const users: string[] = [];
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      // This would need to check if user belongs to tenant
      users.push(userId);
    }
    return users;
  }
}

// Export singleton instance
let socketService: SocketService | null = null;

export const initializeSocket = (server: HTTPServer): SocketService => {
  if (!socketService) {
    socketService = new SocketService(server);
  }
  return socketService;
};

export const getSocketService = (): SocketService | null => {
  return socketService;
};