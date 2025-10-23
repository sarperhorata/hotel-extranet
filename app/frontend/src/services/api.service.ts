import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
      timeout: 10000,
    });

    // Request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(
                `${this.api.defaults.baseURL}/auth/refresh`,
                { refreshToken }
              );

              const { accessToken } = response.data.data;
              localStorage.setItem('accessToken', accessToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'API request failed');
    }
  }

  private async handlePaginatedResponse<T>(response: AxiosResponse<PaginatedResponse<T>>): Promise<PaginatedResponse<T>['data']> {
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'API request failed');
    }
  }

  // Generic GET request
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.api.get<ApiResponse<T>>(url, { params });
    return this.handleResponse(response);
  }

  // Generic paginated GET request
  async getPaginated<T>(url: string, params?: Record<string, any>): Promise<PaginatedResponse<T>['data']> {
    const response = await this.api.get<PaginatedResponse<T>>(url, { params });
    return this.handlePaginatedResponse(response);
  }

  // Generic POST request
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<ApiResponse<T>>(url, data);
    return this.handleResponse(response);
  }

  // Generic PUT request
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<ApiResponse<T>>(url, data);
    return this.handleResponse(response);
  }

  // Generic DELETE request
  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<ApiResponse<T>>(url);
    return this.handleResponse(response);
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Export singleton instance
export const apiService = new ApiService();
