import { RatePlan, RatePlanForm, RatePlanFilters, DynamicPricingRequest } from '../types';
import { apiService } from './api.service';

export class RateService {
  async getRatePlans(filters?: RatePlanFilters): Promise<{ items: RatePlan[]; pagination: any }> {
    return apiService.getPaginated<RatePlan>('/rates/plans', filters);
  }

  async getRatePlan(id: string): Promise<RatePlan> {
    return apiService.get<RatePlan>(`/rates/plans/${id}`);
  }

  async createRatePlan(data: RatePlanForm): Promise<RatePlan> {
    return apiService.post<RatePlan>('/rates/plans', data);
  }

  async updateRatePlan(id: string, data: Partial<RatePlanForm>): Promise<RatePlan> {
    return apiService.put<RatePlan>(`/rates/plans/${id}`, data);
  }

  async deleteRatePlan(id: string): Promise<void> {
    return apiService.delete(`/rates/plans/${id}`);
  }

  async calculateDynamicPricing(request: DynamicPricingRequest): Promise<any> {
    return apiService.post('/rates/calculate-dynamic', request);
  }

  async getRatePlanStats(propertyId?: string): Promise<any> {
    const params = propertyId ? { propertyId } : {};
    return apiService.get('/rates/plans/stats', { params });
  }

  async getSeasonalRates(propertyId: string, year: number): Promise<any> {
    return apiService.get('/rates/seasonal', {
      params: { propertyId, year }
    });
  }

  async updateSeasonalRates(propertyId: string, year: number, rates: any[]): Promise<void> {
    return apiService.put('/rates/seasonal', { propertyId, year, rates });
  }

  async getRatePlanPerformance(ratePlanId: string, startDate: string, endDate: string): Promise<any> {
    return apiService.get('/rates/performance', {
      params: { ratePlanId, startDate, endDate }
    });
  }
}

export const rateService = new RateService();
