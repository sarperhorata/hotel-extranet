import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/server';
import { query } from '../../src/config/database';

describe('Auth Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createApp();

    // Setup test database
    await query('DELETE FROM users WHERE email LIKE $1', ['test%']);
    await query('DELETE FROM tenants WHERE name LIKE $1', ['Test%']);
  });

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM users WHERE email LIKE $1', ['test%']);
    await query('DELETE FROM tenants WHERE name LIKE $1', ['Test%']);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new tenant and user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Hotel Chain',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tenant.name).toBe('Test Hotel Chain');
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Hotel',
          email: 'invalid-email',
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return error for mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Hotel',
          email: 'test2@example.com',
          password: 'password123',
          confirmPassword: 'differentpassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Login Test Hotel',
          email: 'logintest@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('logintest@example.com');
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get access token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'password123',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('logintest@example.com');
      expect(response.body.data.tenant).toBeDefined();
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
