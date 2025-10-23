import { Tenant } from '../types';
import { apiService } from './api.service';

export class TenantService {
  async getTenant(tenantId: string): Promise<Tenant> {
    return apiService.get<Tenant>(`/tenants/${tenantId}`);
  }

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<Tenant> {
    return apiService.put<Tenant>(`/tenants/${tenantId}`, data);
  }

  async getTenantSettings(): Promise<Record<string, any>> {
    return apiService.get<Record<string, any>>('/tenants/settings');
  }

  async updateTenantSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    return apiService.put<Record<string, any>>('/tenants/settings', settings);
  }
}

export const tenantService = new TenantService();
