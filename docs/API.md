# Hotel Extranet System API Documentation

## Overview

This document provides comprehensive API documentation for the Hotel Extranet System. The API follows RESTful conventions and uses JWT authentication for protected endpoints.

## Base URL

```
https://your-backend-domain.com/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting Access Token

#### Register New Tenant
```http
POST /auth/register
Content-Type: application/json

{
  "tenantName": "Hotel Chain ABC",
  "tenantSlug": "hotel-chain-abc",
  "tenantEmail": "info@hotelchain.com",
  "tenantPhone": "+1-555-0123",
  "adminEmail": "admin@hotelchain.com",
  "adminPassword": "securePassword123",
  "adminFirstName": "John",
  "adminLastName": "Doe"
}
```

#### User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@hotelchain.com",
  "password": "securePassword123"
}
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"]
}
```

## Pagination

Paginated responses include pagination metadata:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## Core Resources

### Properties

#### List Properties
```http
GET /properties?page=1&limit=10&city=New York&starRating=4
```

#### Create Property
```http
POST /properties
Content-Type: application/json

{
  "name": "Grand Hotel Downtown",
  "description": "Luxury hotel in city center",
  "address": "456 Hotel Ave",
  "city": "New York",
  "country": "United States",
  "zipCode": "10001",
  "phone": "+1-555-0123",
  "email": "info@grandhotel.com",
  "website": "https://grandhotel.com",
  "starRating": 4,
  "checkInTime": "15:00",
  "checkOutTime": "11:00",
  "amenities": ["Free WiFi", "Swimming Pool", "Gym"],
  "images": ["https://example.com/image1.jpg"]
}
```

#### Get Property Details
```http
GET /properties/{propertyId}
```

#### Update Property
```http
PUT /properties/{propertyId}
Content-Type: application/json

{
  "name": "Updated Hotel Name",
  "starRating": 5
}
```

#### Delete Property
```http
DELETE /properties/{propertyId}
```

### Rooms

#### List Rooms for Property
```http
GET /properties/{propertyId}/rooms
```

#### Create Room
```http
POST /properties/{propertyId}/rooms
Content-Type: application/json

{
  "name": "Deluxe King Room",
  "roomType": "deluxe",
  "description": "Spacious room with city view",
  "maxOccupancy": 4,
  "maxAdults": 2,
  "maxChildren": 2,
  "amenities": ["King Bed", "Balcony", "Mini Bar"],
  "images": ["https://example.com/room1.jpg"],
  "bedType": "King",
  "size": 35
}
```

### Inventory Management

#### Check Availability
```http
POST /inventory/availability
Content-Type: application/json

{
  "propertyId": "prop-123",
  "roomId": "room-123",
  "checkInDate": "2024-03-15",
  "checkOutDate": "2024-03-17",
  "adults": 2,
  "children": 1,
  "rooms": 1
}
```

#### Bulk Update Inventory
```http
PUT /inventory/bulk-update
Content-Type: application/json

{
  "updates": [
    {
      "roomId": "room-123",
      "ratePlanId": "plan-123",
      "date": "2024-03-15",
      "availableRooms": 5,
      "price": 150.00
    }
  ]
}
```

### Rate Plans

#### List Rate Plans
```http
GET /rates/plans?page=1&limit=10&propertyId=prop-123
```

#### Create Rate Plan
```http
POST /rates/plans
Content-Type: application/json

{
  "propertyId": "prop-123",
  "name": "Standard Rate",
  "planType": "standard",
  "basePrice": 100.00,
  "currency": "USD",
  "isDynamic": false,
  "restrictions": {
    "minStay": 1,
    "maxStay": 30
  }
}
```

#### Calculate Dynamic Pricing
```http
POST /rates/calculate-dynamic
Content-Type: application/json

{
  "ratePlanId": "plan-123",
  "roomId": "room-123",
  "date": "2024-03-15",
  "basePrice": 100.00,
  "demandLevel": "high",
  "season": "high_season",
  "occupancyRate": 0.8
}
```

### Search Engine

#### Search Available Rooms
```http
POST /search/availability
Content-Type: application/json

{
  "checkInDate": "2024-03-15",
  "checkOutDate": "2024-03-17",
  "adults": 2,
  "children": 1,
  "rooms": 1,
  "city": "New York",
  "country": "United States",
  "roomType": "deluxe",
  "minPrice": 100,
  "maxPrice": 300,
  "amenities": ["Free WiFi"],
  "sortBy": "price",
  "sortOrder": "asc"
}
```

#### Get Search Suggestions
```http
GET /search/suggestions?query=New York&type=cities
```

#### Get Popular Destinations
```http
GET /search/destinations?limit=10
```

### Bookings

#### Create Booking
```http
POST /bookings
Content-Type: application/json

{
  "propertyId": "prop-123",
  "roomId": "room-123",
  "ratePlanId": "plan-123",
  "checkInDate": "2024-03-15",
  "checkOutDate": "2024-03-17",
  "adults": 2,
  "children": 1,
  "rooms": 1,
  "guestInfo": {
    "email": "guest@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1-555-0123"
  },
  "specialRequests": "Late check-in requested"
}
```

#### List Bookings
```http
GET /bookings?page=1&limit=10&status=confirmed&checkInDate=2024-03-15
```

#### Get Booking Details
```http
GET /bookings/{bookingId}
```

#### Update Booking
```http
PUT /bookings/{bookingId}
Content-Type: application/json

{
  "status": "cancelled"
}
```

#### Cancel Booking
```http
PUT /bookings/{bookingId}/cancel
Content-Type: application/json

{
  "reason": "Guest requested cancellation"
}
```

### Channel Management

#### List Channels
```http
GET /channels?page=1&limit=10
```

#### Create Channel Configuration
```http
POST /channels
Content-Type: application/json

{
  "name": "Booking.com",
  "channelType": "booking.com",
  "apiEndpoint": "https://api.booking.com",
  "apiKey": "your-api-key",
  "hotelId": "12345",
  "syncEnabled": true,
  "syncFrequency": 3600
}
```

#### Sync Data to Channel
```http
POST /channels/{channelId}/sync
Content-Type: application/json

{
  "syncType": "inventory"
}
```

#### Pull Bookings from Channel
```http
POST /channels/{channelId}/pull-bookings
Content-Type: application/json

{
  "startDate": "2024-03-01",
  "endDate": "2024-03-31"
}
```

### Payments (VCC)

#### Generate Virtual Credit Card
```http
POST /payments/vcc/generate
Content-Type: application/json

{
  "bookingId": "booking-123",
  "amount": 450.00,
  "currency": "USD",
  "expiryDays": 30,
  "description": "Payment for booking BK123456"
}
```

#### Send VCC to Channel
```http
POST /payments/vcc/{paymentId}/send
Content-Type: application/json

{
  "channelId": "channel-123",
  "sendMethod": "api"
}
```

### Notifications

#### Get User Notifications
```http
GET /notifications?page=1&limit=50&unreadOnly=true
```

#### Mark Notification as Read
```http
PUT /notifications/{notificationId}/read
```

#### Send Booking Confirmation Email
```http
POST /notifications/booking-confirmation
Content-Type: application/json

{
  "bookingId": "booking-123",
  "guestEmail": "guest@example.com"
}
```

#### Send Test Email
```http
POST /notifications/test-email
Content-Type: application/json

{
  "email": "test@example.com",
  "type": "booking_confirmation"
}
```

## WebSocket Events

### Client → Server Events

#### Authenticate
```javascript
socket.emit('authenticate', {
  token: 'your-jwt-token',
  tenantId: 'tenant-123'
});
```

#### Join Room
```javascript
socket.emit('join_room', 'tenant_tenant-123');
```

### Server → Client Events

#### Booking Created
```javascript
socket.on('booking_created', (notification) => {
  console.log('New booking:', notification);
});
```

#### Inventory Updated
```javascript
socket.on('inventory_updated', (notification) => {
  console.log('Inventory changed:', notification);
});
```

#### System Notification
```javascript
socket.on('system_notification', (notification) => {
  console.log('System alert:', notification);
});
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (resource already exists) |
| 422 | Unprocessable Entity (business rule violation) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

## Rate Limiting

- **Authentication endpoints:** 5 requests per 15 minutes
- **General API:** 100 requests per minute
- **File uploads:** 10 uploads per hour

## Versioning

API versioning is handled through URL paths:
- Current: `/api/v1/`
- Future: `/api/v2/` (when breaking changes are introduced)

## Testing the API

### Using Swagger UI

1. Visit: `https://your-backend-domain.com/api-docs`
2. Click "Authorize" and enter your JWT token
3. Test any endpoint directly from the interface

### Using cURL

```bash
# Login
curl -X POST https://your-backend-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Get properties (requires token)
curl -X GET https://your-backend-domain.com/api/v1/properties \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Best Practices

### Authentication
- Always include JWT token in Authorization header
- Store tokens securely (httpOnly cookies recommended)
- Refresh tokens before expiration
- Logout to invalidate tokens

### Error Handling
- Check `success` field in all responses
- Handle different HTTP status codes appropriately
- Use pagination for large result sets
- Implement retry logic for transient failures

### Performance
- Use appropriate pagination limits (10-50 items)
- Filter results on server side, not client side
- Cache frequently accessed data
- Use WebSocket for real-time updates

### Security
- Never expose sensitive data in responses
- Validate all input data
- Use HTTPS in production
- Keep API keys secure

## Support

For API support and questions:
- **Email:** support@yourdomain.com
- **Documentation:** https://your-backend-domain.com/api-docs
- **Status Page:** Check system status and uptime

## Changelog

### Version 1.0.0
- Initial API release
- Multi-tenant architecture
- Complete booking engine
- Channel manager integration structure
- VCC payment system
- Real-time notifications

---

*This API documentation is automatically generated from the codebase and kept in sync with the latest changes.*
