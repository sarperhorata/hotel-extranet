import { query } from '../config/database';
import { logger } from '../../utils/logger';

export interface NotificationData {
  tenantId: string;
  userId?: string;
  type: 'booking_confirmation' | 'booking_cancellation' | 'payment_confirmation' | 'inventory_alert' | 'system';
  title: string;
  message: string;
  data?: any;
  email?: string;
  priority?: 'low' | 'medium' | 'high';
}

export class NotificationService {
  // Create notification
  static async createNotification(notificationData: NotificationData): Promise<any> {
    try {
      const result = await query(`
        INSERT INTO notifications (
          tenant_id, user_id, type, title, message, data, email, priority, is_read
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, false
        ) RETURNING id, created_at
      `, [
        notificationData.tenantId,
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.data,
        notificationData.email,
        notificationData.priority || 'medium'
      ]);

      const notification = result.rows[0];
      
      logger.info(`Notification created: ${notificationData.type} for tenant ${notificationData.tenantId}`);
      
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Get notifications for user
  static async getUserNotifications(tenantId: string, userId?: string, limit = 50): Promise<any[]> {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (userId) {
        whereClause += ` AND (user_id = $${paramIndex} OR user_id IS NULL)`;
        params.push(userId);
        paramIndex++;
      }

      const result = await query(`
        SELECT 
          id, type, title, message, data, email, priority, is_read, created_at
        FROM notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `, [...params, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, tenantId: string): Promise<void> {
    try {
      await query(
        'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2',
        [notificationId, tenantId]
      );

      logger.info(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(tenantId: string, userId?: string): Promise<void> {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      await query(
        `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP ${whereClause}`,
        params
      );

      logger.info(`All notifications marked as read for tenant ${tenantId}`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getNotificationStats(tenantId: string, userId?: string): Promise<any> {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (userId) {
        whereClause += ` AND (user_id = $${paramIndex} OR user_id IS NULL)`;
        params.push(userId);
        paramIndex++;
      }

      const result = await query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          COUNT(CASE WHEN type = 'booking_confirmation' THEN 1 END) as booking_confirmations,
          COUNT(CASE WHEN type = 'booking_cancellation' THEN 1 END) as booking_cancellations,
          COUNT(CASE WHEN type = 'payment_confirmation' THEN 1 END) as payment_confirmations,
          COUNT(CASE WHEN type = 'inventory_alert' THEN 1 END) as inventory_alerts,
          COUNT(CASE WHEN type = 'system' THEN 1 END) as system_notifications,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_notifications
        FROM notifications
        ${whereClause}
      `, params);

      const stats = result.rows[0];

      return {
        totalNotifications: parseInt(stats.total_notifications),
        unreadCount: parseInt(stats.unread_count),
        bookingConfirmations: parseInt(stats.booking_confirmations),
        bookingCancellations: parseInt(stats.booking_cancellations),
        paymentConfirmations: parseInt(stats.payment_confirmations),
        inventoryAlerts: parseInt(stats.inventory_alerts),
        systemNotifications: parseInt(stats.system_notifications),
        recentNotifications: parseInt(stats.recent_notifications)
      };
    } catch (error) {
      logger.error('Failed to get notification statistics:', error);
      throw error;
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(daysToKeep = 90): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM notifications WHERE created_at < CURRENT_DATE - INTERVAL $1 days',
        [daysToKeep]
      );

      logger.info(`Cleaned up ${result.rowCount} old notifications`);
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
      throw error;
    }
  }
}
