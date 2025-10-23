import { Channel, ChannelForm, ChannelFilters, ChannelSyncRequest } from '../types';
import { apiService } from './api.service';

export class ChannelService {
  async getChannels(filters?: ChannelFilters): Promise<{ items: Channel[]; pagination: any }> {
    return apiService.getPaginated<Channel>('/channels', filters);
  }

  async getChannel(id: string): Promise<Channel> {
    return apiService.get<Channel>(`/channels/${id}`);
  }

  async createChannel(data: ChannelForm): Promise<Channel> {
    return apiService.post<Channel>('/channels', data);
  }

  async updateChannel(id: string, data: Partial<ChannelForm>): Promise<Channel> {
    return apiService.put<Channel>(`/channels/${id}`, data);
  }

  async deleteChannel(id: string): Promise<void> {
    return apiService.delete(`/channels/${id}`);
  }

  async syncToChannel(id: string, syncType: 'inventory' | 'rates' | 'bookings'): Promise<any> {
    return apiService.post(`/channels/${id}/sync`, { syncType });
  }

  async pullBookingsFromChannel(id: string, startDate: string, endDate: string): Promise<any> {
    return apiService.post(`/channels/${id}/pull-bookings`, { startDate, endDate });
  }

  async pushInventoryToChannel(id: string, propertyId: string): Promise<any> {
    return apiService.post(`/channels/${id}/push-inventory`, { propertyId });
  }

  async getChannelMappings(channelId: string): Promise<any> {
    return apiService.get(`/channels/${id}/mappings`);
  }

  async updateChannelMappings(channelId: string, mappings: any[]): Promise<void> {
    return apiService.put(`/channels/${channelId}/mappings`, { mappings });
  }

  async getChannelStats(channelId?: string): Promise<any> {
    const params = channelId ? { channelId } : {};
    return apiService.get('/channels/stats', { params });
  }

  async testChannelConnection(id: string): Promise<any> {
    return apiService.post(`/channels/${id}/test-connection`);
  }

  async getChannelSyncStatus(id: string): Promise<any> {
    return apiService.get(`/channels/${id}/sync-status`);
  }
}

export const channelService = new ChannelService();
