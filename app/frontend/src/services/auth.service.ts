import { LoginForm, RegisterForm, User, Tenant } from '../types';
import { apiService } from './api.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

export class AuthService {
  async login(credentials: LoginForm): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  }

  async register(data: RegisterForm): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data);
  }

  async getCurrentUser(): Promise<{ user: User; tenant: Tenant } | null> {
    try {
      return await apiService.get<{ user: User; tenant: Tenant }>('/auth/profile');
    } catch (error) {
      return null;
    }
  }

  async refreshToken(): Promise<{ accessToken: string } | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      return apiService.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken,
      });
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiService.put<User>('/auth/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiService.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }
}

export const authService = new AuthService();
