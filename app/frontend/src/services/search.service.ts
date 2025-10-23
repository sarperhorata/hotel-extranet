import { SearchCriteria, SearchResult, SearchFilters } from '../types';
import { apiService } from './api.service';

export class SearchService {
  async searchAvailability(criteria: SearchCriteria): Promise<{ items: SearchResult[]; pagination: any }> {
    return apiService.post<{ items: SearchResult[]; pagination: any }>('/search/availability', criteria);
  }

  async getSearchSuggestions(query: string, type: 'cities' | 'properties' | 'amenities'): Promise<string[]> {
    return apiService.get<string[]>('/search/suggestions', {
      params: { query, type }
    });
  }

  async getPopularDestinations(limit: number = 10): Promise<any[]> {
    return apiService.get('/search/destinations', {
      params: { limit }
    });
  }

  async getSearchFilters(): Promise<any> {
    return apiService.get('/search/filters');
  }

  async getPropertyAvailability(propertyId: string, criteria: {
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    rooms: number;
  }): Promise<any> {
    return apiService.post(`/search/properties/${propertyId}/availability`, criteria);
  }

  async getSearchHistory(): Promise<any[]> {
    return apiService.get('/search/history');
  }

  async saveSearch(criteria: SearchCriteria, name: string): Promise<void> {
    return apiService.post('/search/save', { criteria, name });
  }

  async getSavedSearches(): Promise<any[]> {
    return apiService.get('/search/saved');
  }

  async deleteSavedSearch(id: string): Promise<void> {
    return apiService.delete(`/search/saved/${id}`);
  }

  async getSearchAnalytics(startDate: string, endDate: string): Promise<any> {
    return apiService.get('/search/analytics', {
      params: { startDate, endDate }
    });
  }
}

export const searchService = new SearchService();
