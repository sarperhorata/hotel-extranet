import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Extranet System API',
      version: '1.0.0',
      description: 'Comprehensive SaaS hotel management system with multi-tenant architecture',
      contact: {
        name: 'API Support',
        email: 'support@hotel-extranet.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://your-production-domain.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        tenantAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Tenant-ID',
          description: 'Tenant ID for multi-tenant operations',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: { type: 'string' },
              example: ['Validation error 1', 'Validation error 2'],
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { type: 'object' } },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number', example: 1 },
                    limit: { type: 'number', example: 10 },
                    total: { type: 'number', example: 100 },
                    totalPages: { type: 'number', example: 10 },
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user-123' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['admin', 'hotel_manager', 'staff'], example: 'admin' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'tenant-123' },
            name: { type: 'string', example: 'Hotel Chain ABC' },
            email: { type: 'string', example: 'info@hotelchain.com' },
            phone: { type: 'string', example: '+1-555-0123' },
            address: { type: 'string', example: '123 Main St, City, State' },
            city: { type: 'string', example: 'New York' },
            country: { type: 'string', example: 'United States' },
            website: { type: 'string', example: 'https://hotelchain.com' },
            settings: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Property: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'prop-123' },
            tenantId: { type: 'string', example: 'tenant-123' },
            name: { type: 'string', example: 'Grand Hotel Downtown' },
            description: { type: 'string', example: 'Luxury hotel in city center' },
            address: { type: 'string', example: '456 Hotel Ave' },
            city: { type: 'string', example: 'New York' },
            country: { type: 'string', example: 'United States' },
            zipCode: { type: 'string', example: '10001' },
            phone: { type: 'string', example: '+1-555-0123' },
            email: { type: 'string', example: 'info@grandhotel.com' },
            website: { type: 'string', example: 'https://grandhotel.com' },
            starRating: { type: 'number', minimum: 1, maximum: 5, example: 4 },
            checkInTime: { type: 'string', example: '15:00' },
            checkOutTime: { type: 'string', example: '11:00' },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['Free WiFi', 'Swimming Pool', 'Gym'],
            },
            images: {
              type: 'array',
              items: { type: 'string' },
              example: ['https://example.com/image1.jpg'],
            },
            isActive: { type: 'boolean', example: true },
            latitude: { type: 'number', example: 40.7128 },
            longitude: { type: 'number', example: -74.0060 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'room-123' },
            propertyId: { type: 'string', example: 'prop-123' },
            name: { type: 'string', example: 'Deluxe King Room' },
            roomType: { type: 'string', example: 'deluxe' },
            description: { type: 'string', example: 'Spacious room with city view' },
            maxOccupancy: { type: 'number', example: 4 },
            maxAdults: { type: 'number', example: 2 },
            maxChildren: { type: 'number', example: 2 },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['King Bed', 'Balcony', 'Mini Bar'],
            },
            images: {
              type: 'array',
              items: { type: 'string' },
              example: ['https://example.com/room1.jpg'],
            },
            bedType: { type: 'string', example: 'King' },
            size: { type: 'number', example: 35 },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'booking-123' },
            bookingReference: { type: 'string', example: 'BK123456789' },
            propertyId: { type: 'string', example: 'prop-123' },
            roomId: { type: 'string', example: 'room-123' },
            guestId: { type: 'string', example: 'guest-123' },
            status: {
              type: 'string',
              enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
              example: 'confirmed',
            },
            checkInDate: { type: 'string', format: 'date', example: '2024-03-15' },
            checkOutDate: { type: 'string', format: 'date', example: '2024-03-17' },
            adults: { type: 'number', example: 2 },
            children: { type: 'number', example: 1 },
            rooms: { type: 'number', example: 1 },
            totalAmount: { type: 'number', example: 450.00 },
            currency: { type: 'string', example: 'USD' },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'paid', 'refunded', 'failed'],
              example: 'paid',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SearchCriteria: {
          type: 'object',
          required: ['checkInDate', 'checkOutDate'],
          properties: {
            checkInDate: { type: 'string', format: 'date', example: '2024-03-15' },
            checkOutDate: { type: 'string', format: 'date', example: '2024-03-17' },
            adults: { type: 'number', minimum: 1, maximum: 10, example: 2 },
            children: { type: 'number', minimum: 0, maximum: 10, example: 1 },
            rooms: { type: 'number', minimum: 1, maximum: 5, example: 1 },
            propertyId: { type: 'string', example: 'prop-123' },
            city: { type: 'string', example: 'New York' },
            country: { type: 'string', example: 'United States' },
            roomType: { type: 'string', example: 'deluxe' },
            minPrice: { type: 'number', example: 100 },
            maxPrice: { type: 'number', example: 500 },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['Free WiFi', 'Swimming Pool'],
            },
            sortBy: { type: 'string', enum: ['price', 'rating', 'name'], example: 'price' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], example: 'asc' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        tenantAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/*/auth*.ts',
    './src/modules/*/tenant*.ts',
    './src/modules/*/propert*.ts',
    './src/modules/*/room*.ts',
    './src/modules/*/inventory*.ts',
    './src/modules/*/rate*.ts',
    './src/modules/*/search*.ts',
    './src/modules/*/booking*.ts',
    './src/modules/*/channel*.ts',
    './src/modules/*/payment*.ts',
    './src/modules/*/notification*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Hotel Extranet API Documentation',
  }));

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at: /api-docs');
};
