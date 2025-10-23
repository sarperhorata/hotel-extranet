import { RoomInventory, InventoryFilters, InventoryUpdate } from '../types';
import { apiService } from './api.service';

export class InventoryService {
  async getInventory(filters?: InventoryFilters): Promise<{ items: RoomInventory[]; pagination: any }> {
    return apiService.getPaginated<RoomInventory>('/inventory', filters);
  }

  async getInventoryByDate(date: string, propertyId?: string): Promise<RoomInventory[]> {
    const params = { date, propertyId };
    return apiService.get<RoomInventory[]>('/inventory/by-date', { params });
  }

  async checkAvailability(criteria: {
    propertyId: string;
    roomId?: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    rooms: number;
  }): Promise<any> {
    return apiService.post('/inventory/availability', criteria);
  }

  async updateInventory(id: string, data: Partial<RoomInventory>): Promise<RoomInventory> {
    return apiService.put<RoomInventory>(`/inventory/${id}`, data);
  }

  async bulkUpdateInventory(updates: InventoryUpdate[]): Promise<void> {
    return apiService.put('/inventory/bulk-update', { updates });
  }

  async getInventoryStats(propertyId?: string): Promise<any> {
    const params = propertyId ? { propertyId } : {};
    return apiService.get('/inventory/stats', { params });
  }

  async getAvailabilityCalendar(propertyId: string, startDate: string, endDate: string): Promise<any> {
    return apiService.get('/inventory/calendar', {
      params: { propertyId, startDate, endDate }
    });
  }
}

export const inventoryService = new InventoryService();
