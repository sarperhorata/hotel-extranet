import { Booking, BookingForm, BookingFilters } from '../types';
import { apiService } from './api.service';

export class BookingService {
  async getBookings(filters?: BookingFilters): Promise<{ items: Booking[]; pagination: any }> {
    return apiService.getPaginated<Booking>('/bookings', filters);
  }

  async getBooking(id: string): Promise<Booking> {
    return apiService.get<Booking>(`/bookings/${id}`);
  }

  async createBooking(data: BookingForm): Promise<Booking> {
    return apiService.post<Booking>('/bookings', data);
  }

  async updateBooking(id: string, data: Partial<BookingForm>): Promise<Booking> {
    return apiService.put<Booking>(`/bookings/${id}`, data);
  }

  async cancelBooking(id: string, reason?: string): Promise<void> {
    return apiService.put(`/bookings/${id}/cancel`, { reason });
  }

  async getBookingStats(): Promise<any> {
    return apiService.get('/bookings/stats');
  }
}

export const bookingService = new BookingService();
