import { Property, PropertyForm, PropertyFilters } from '../types';
import { apiService } from './api.service';

export class PropertyService {
  async getProperties(filters?: PropertyFilters): Promise<{ items: Property[]; pagination: any }> {
    return apiService.getPaginated<Property>('/properties', filters);
  }

  async getProperty(id: string): Promise<Property> {
    return apiService.get<Property>(`/properties/${id}`);
  }

  async createProperty(data: PropertyForm): Promise<Property> {
    return apiService.post<Property>('/properties', data);
  }

  async updateProperty(id: string, data: PropertyForm): Promise<Property> {
    return apiService.put<Property>(`/properties/${id}`, data);
  }

  async deleteProperty(id: string): Promise<void> {
    return apiService.delete(`/properties/${id}`);
  }

  async getPropertyStats(id: string): Promise<any> {
    return apiService.get(`/properties/${id}/stats`);
  }
}

export const propertyService = new PropertyService();
