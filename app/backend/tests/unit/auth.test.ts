import { Request, Response } from 'express';
import { login, register, getProfile } from '../../src/modules/auth/auth.controller';
import { authService } from '../../src/modules/auth/auth.service';
import { createMockRequest, createMockResponse } from '../setup';

// Mock the auth service
jest.mock('../../src/modules/auth/auth.service');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin' as const,
        isActive: true,
      };

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
        tenant: { id: 'tenant-1', name: 'Test Tenant' },
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResponse,
        message: 'Login successful',
      });
    });

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthService.login.mockRejectedValue(new Error(errorMessage));

      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: errorMessage,
      });
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'admin' as const,
        isActive: true,
      };

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
        tenant: { id: 'tenant-1', name: 'New Tenant' },
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      mockReq.body = {
        name: 'New Tenant',
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.register).toHaveBeenCalledWith({
        name: 'New Tenant',
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResponse,
        message: 'Registration successful',
      });
    });

    it('should handle validation errors', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: '123',
      };

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockProfile = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin' as const,
          isActive: true,
        },
        tenant: { id: 'tenant-1', name: 'Test Tenant' },
      };

      mockAuthService.getCurrentUser.mockResolvedValue(mockProfile);

      mockReq.user = { id: 'user-1' };
      mockReq.tenantId = 'tenant-1';

      await getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should handle unauthorized access', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      await getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });
  });
});
