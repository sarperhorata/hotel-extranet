import { Room, RoomForm, RoomFilters } from '../types';
import { apiService } from './api.service';

export class RoomService {
  async getRooms(propertyId: string, filters?: RoomFilters): Promise<{ items: Room[]; pagination: any }> {
    return apiService.getPaginated<Room>(`/properties/${propertyId}/rooms`, filters);
  }

  async getRoom(propertyId: string, roomId: string): Promise<Room> {
    return apiService.get<Room>(`/properties/${propertyId}/rooms/${roomId}`);
  }

  async createRoom(propertyId: string, data: RoomForm): Promise<Room> {
    return apiService.post<Room>(`/properties/${propertyId}/rooms`, data);
  }

  async updateRoom(propertyId: string, roomId: string, data: Partial<RoomForm>): Promise<Room> {
    return apiService.put<Room>(`/properties/${propertyId}/rooms/${roomId}`, data);
  }

  async deleteRoom(propertyId: string, roomId: string): Promise<void> {
    return apiService.delete(`/properties/${propertyId}/rooms/${roomId}`);
  }

  async getRoomStats(propertyId: string, roomId: string): Promise<any> {
    return apiService.get(`/properties/${propertyId}/rooms/${roomId}/stats`);
  }

  async getRoomAvailability(propertyId: string, roomId: string, startDate: string, endDate: string): Promise<any> {
    return apiService.get(`/properties/${propertyId}/rooms/${roomId}/availability`, {
      params: { startDate, endDate }
    });
  }

  async getRoomTypes(): Promise<string[]> {
    return apiService.get<string[]>('/rooms/types');
  }

  async getBedTypes(): Promise<string[]> {
    return apiService.get<string[]>('/rooms/bed-types');
  }

  async getRoomAmenities(): Promise<string[]> {
    return apiService.get<string[]>('/rooms/amenities');
  }

  async duplicateRoom(propertyId: string, roomId: string, newName: string): Promise<Room> {
    return apiService.post<Room>(`/properties/${propertyId}/rooms/${roomId}/duplicate`, {
      name: newName
    });
  }
}

export const roomService = new RoomService();
