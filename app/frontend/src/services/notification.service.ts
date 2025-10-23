import { Notification, NotificationFilters } from '../types';
import { apiService } from './api.service';

export class NotificationService {
  async getNotifications(filters?: NotificationFilters): Promise<{ items: Notification[]; pagination: any }> {
    return apiService.getPaginated<Notification>('/notifications', filters);
  }

  async getNotification(id: string): Promise<Notification> {
    return apiService.get<Notification>(`/notifications/${id}`);
  }

  async markAsRead(id: string): Promise<void> {
    return apiService.put(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    return apiService.put('/notifications/mark-all-read');
  }

  async deleteNotification(id: string): Promise<void> {
    return apiService.delete(`/notifications/${id}`);
  }

  async sendBookingConfirmation(bookingId: string, guestEmail: string): Promise<void> {
    return apiService.post('/notifications/booking-confirmation', {
      bookingId,
      guestEmail
    });
  }

  async sendTestEmail(email: string, type: 'booking_confirmation' | 'booking_cancellation' | 'payment_confirmation'): Promise<void> {
    return apiService.post('/notifications/test-email', {
      email,
      type
    });
  }

  async getNotificationStats(): Promise<any> {
    return apiService.get('/notifications/stats');
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiService.get<{ count: number }>('/notifications/unread-count');
    return response.count;
  }

  async updateNotificationSettings(settings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    bookingAlerts: boolean;
    inventoryAlerts: boolean;
  }): Promise<void> {
    return apiService.put('/notifications/settings', settings);
  }

  async getNotificationSettings(): Promise<any> {
    return apiService.get('/notifications/settings');
  }
}

export const notificationService = new NotificationService();
