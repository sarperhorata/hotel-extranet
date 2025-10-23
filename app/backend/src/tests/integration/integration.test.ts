import request from 'supertest';
import { app } from '../../server';
import { query } from '../config/database';
import { redisService } from '../../services/redis.service';
import { logger } from '../../utils/logger';

describe('Integration Tests', () => {
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test database
    await query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    await query('DELETE FROM tenants WHERE name = $1', ['Test Tenant']);
    
    // Create test tenant
    const tenantResult = await query(`
      INSERT INTO tenants (name, domain, is_active)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Test Tenant', 'test.example.com', true]);
    
    tenantId = tenantResult.rows[0].id;
    
    // Create test user
    const userResult = await query(`
      INSERT INTO users (tenant_id, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [tenantId, 'test@example.com', 'hashed_password', 'admin', true]);
    
    userId = userResult.rows[0].id;
    
    // Generate auth token
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM users WHERE id = $1', [userId]);
    await query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  });

  describe('Database Integration', () => {
    test('should connect to database', async () => {
      const result = await query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    test('should create and retrieve tenant', async () => {
      const result = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      expect(result.rows[0].name).toBe('Test Tenant');
    });

    test('should create and retrieve user', async () => {
      const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(result.rows[0].email).toBe('test@example.com');
    });
  });

  describe('Redis Integration', () => {
    test('should connect to Redis', async () => {
      const ping = await redisService.ping();
      expect(ping).toBe(true);
    });

    test('should set and get cache value', async () => {
      const key = 'test-key';
      const value = { test: 'data' };
      
      await redisService.setCache(key, value);
      const retrieved = await redisService.getCache(key);
      
      expect(retrieved).toEqual(value);
    });

    test('should delete cache value', async () => {
      const key = 'test-delete-key';
      const value = { test: 'delete' };
      
      await redisService.setCache(key, value);
      const deleted = await redisService.deleteCache(key);
      
      expect(deleted).toBe(true);
    });
  });

  describe('API Integration', () => {
    test('should return health check', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
    });

    test('should authenticate user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(response.body.token).toBeDefined();
      authToken = `Bearer ${response.body.token}`;
    });

    test('should access protected route', async () => {
      const response = await request(app)
        .get('/api/v1/properties')
        .set('Authorization', authToken)
        .expect(200);
      
      expect(response.body).toBeDefined();
    });
  });

  describe('External Service Integration', () => {
    test('should test email service', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/test-email')
        .set('Authorization', authToken)
        .send({
          to: 'test@example.com',
          subject: 'Test Email',
          message: 'This is a test email'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('should test file storage service', async () => {
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', authToken)
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(200);
      
      expect(response.body.id).toBeDefined();
    });

    test('should test payment gateway', async () => {
      const response = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', authToken)
        .send({
          bookingId: 'test-booking',
          amount: 100.00,
          currency: 'USD',
          paymentMethod: 'card',
          customerEmail: 'test@example.com'
        })
        .expect(200);
      
      expect(response.body.transactionId).toBeDefined();
    });

    test('should test VCC provider', async () => {
      const response = await request(app)
        .post('/api/v1/payments/vcc/generate')
        .set('Authorization', authToken)
        .send({
          bookingId: 'test-booking',
          amount: 100.00,
          currency: 'USD',
          expiryDays: 30
        })
        .expect(200);
      
      expect(response.body.vccDetails).toBeDefined();
    });
  });

  describe('Channel Manager Integration', () => {
    test('should test channel connection', async () => {
      const response = await request(app)
        .post('/api/v1/channels/test-connection')
        .set('Authorization', authToken)
        .send({
          channelType: 'siteminder',
          apiKey: 'test-key',
          apiSecret: 'test-secret'
        })
        .expect(200);
      
      expect(response.body.connected).toBe(true);
    });

    test('should sync inventory to channel', async () => {
      const response = await request(app)
        .post('/api/v1/channels/sync/inventory')
        .set('Authorization', authToken)
        .send({
          channelId: 'test-channel',
          propertyId: 'test-property'
        })
        .expect(200);
      
      expect(response.body.synced).toBe(true);
    });

    test('should pull bookings from channel', async () => {
      const response = await request(app)
        .post('/api/v1/channels/pull/bookings')
        .set('Authorization', authToken)
        .send({
          channelId: 'test-channel',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);
      
      expect(response.body.bookings).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    test('should complete booking workflow', async () => {
      // 1. Search for properties
      const searchResponse = await request(app)
        .get('/api/v1/search/properties')
        .query({
          checkIn: '2024-01-15',
          checkOut: '2024-01-17',
          guests: 2
        })
        .expect(200);
      
      expect(searchResponse.body.properties).toBeDefined();
      
      // 2. Create booking
      const bookingResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', authToken)
        .send({
          propertyId: 'test-property',
          checkIn: '2024-01-15',
          checkOut: '2024-01-17',
          guests: 2,
          guestName: 'Test Guest',
          guestEmail: 'test@example.com'
        })
        .expect(200);
      
      expect(bookingResponse.body.bookingReference).toBeDefined();
      
      // 3. Process payment
      const paymentResponse = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', authToken)
        .send({
          bookingId: bookingResponse.body.id,
          amount: 200.00,
          currency: 'USD',
          paymentMethod: 'card',
          customerEmail: 'test@example.com'
        })
        .expect(200);
      
      expect(paymentResponse.body.transactionId).toBeDefined();
      
      // 4. Send confirmation email
      const emailResponse = await request(app)
        .post('/api/v1/notifications/booking-confirmation')
        .set('Authorization', authToken)
        .send({
          bookingId: bookingResponse.body.id,
          email: 'test@example.com'
        })
        .expect(200);
      
      expect(emailResponse.body.sent).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/monitoring/health')
          .expect(200)
      );
      
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });

    test('should cache API responses', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/v1/properties')
        .set('Authorization', authToken)
        .expect(200);
      
      // Second request (should be cached)
      const response2 = await request(app)
        .get('/api/v1/properties')
        .set('Authorization', authToken)
        .expect(200);
      
      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/properties')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBeDefined();
    });

    test('should handle Redis errors gracefully', async () => {
      // Simulate Redis error
      jest.spyOn(redisService, 'getCache').mockRejectedValue(new Error('Redis error'));
      
      const response = await request(app)
        .get('/api/v1/properties')
        .set('Authorization', authToken)
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    test('should handle external service errors gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', authToken)
        .send({
          bookingId: 'invalid-booking',
          amount: 100.00,
          currency: 'USD',
          paymentMethod: 'card',
          customerEmail: 'test@example.com'
        })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });
});
