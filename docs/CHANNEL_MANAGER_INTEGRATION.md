# Channel Manager Integration Documentation

## Overview

The Hotel Extranet System provides comprehensive Channel Manager (CM) integration capabilities, allowing hotels to manage inventory, rates, and bookings across multiple distribution channels. The system supports major channel managers including SiteMinder, HotelRunner, Dingus, Elektraweb, and others.

## 🏗️ **Channel Manager Architecture**

### **Core Components**
- **Channel Configuration** - Channel manager setup and credentials
- **Channel Mappings** - Property/room mapping to external systems
- **Inventory Sync** - Real-time inventory synchronization
- **Booking Sync** - Bidirectional booking synchronization
- **VCC Integration** - Virtual Credit Card generation and management
- **Payment Policies** - Automated payment processing rules

### **Supported Channel Managers**
- ✅ **SiteMinder** - Global distribution platform
- ✅ **HotelRunner** - Turkish market leader
- ✅ **Dingus** - European distribution network
- ✅ **Elektraweb** - Central European markets
- ✅ **Custom APIs** - Extensible for any channel manager

## 📊 **Channel Manager Features**

### **1. Channel Configuration**
- **Channel Setup** - API credentials and endpoints
- **Property Mapping** - Internal to external property mapping
- **Room Mapping** - Room type and rate plan mapping
- **Sync Settings** - Frequency and automation configuration
- **Connection Testing** - API connectivity validation

### **2. Inventory Management**
- **Real-time Sync** - Live inventory updates
- **Bulk Updates** - Mass inventory modifications
- **Rate Management** - Dynamic pricing synchronization
- **Availability Control** - Stop-sell and close-out management
- **Restriction Handling** - Minimum stay, CTA/CTD rules

### **3. Booking Management**
- **Booking Creation** - New booking synchronization
- **Booking Updates** - Modification and cancellation handling
- **Guest Information** - Complete guest data transfer
- **Payment Processing** - VCC generation and management
- **Status Tracking** - Real-time booking status updates

### **4. VCC (Virtual Credit Card) System**
- **Card Generation** - Automated VCC creation
- **Balance Management** - Real-time balance tracking
- **Payment Policies** - Automated payment rules
- **Card Closure** - Automatic card deactivation
- **Usage Analytics** - Comprehensive reporting

## 🔧 **Implementation Details**

### **Channel Configuration**
```typescript
// Channel setup with API credentials
const channel = {
  name: 'SiteMinder Integration',
  channelType: 'siteminder',
  apiEndpoint: 'https://api.siteminder.com/v1',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  hotelId: 'external-hotel-id',
  configuration: {
    syncFrequency: 3600, // 1 hour
    autoSync: true,
    retryAttempts: 3
  }
};
```

### **Inventory Synchronization**
```typescript
// Sync inventory to channel
const inventoryData = [
  {
    propertyId: 'prop-123',
    roomId: 'room-456',
    ratePlanId: 'rate-789',
    date: '2024-01-20',
    availableRooms: 5,
    price: 150.00,
    currency: 'USD',
    restrictions: {
      minStay: 2,
      closedToArrival: false,
      closedToDeparture: false
    }
  }
];

const result = await ChannelSyncService.syncInventoryToChannel(
  tenantId,
  channelId,
  inventoryData
);
```

### **Booking Synchronization**
```typescript
// Sync booking to channel
const bookingData = {
  bookingId: 'booking-123',
  bookingReference: 'BK123456789',
  channel: 'siteminder',
  channelBookingId: 'SM789012345',
  propertyId: 'prop-123',
  roomId: 'room-456',
  checkInDate: '2024-01-20',
  checkOutDate: '2024-01-22',
  adults: 2,
  children: 0,
  rooms: 1,
  totalAmount: 300.00,
  currency: 'USD',
  guestInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  },
  status: 'confirmed'
};

const result = await ChannelSyncService.syncBookingToChannel(
  tenantId,
  channelId,
  bookingData
);
```

## 💳 **VCC (Virtual Credit Card) System**

### **Payment Policy Configuration**
```typescript
// Payment policy setup
const paymentPolicy = {
  name: 'Standard Deposit Policy',
  policyType: 'deposit',
  depositPercentage: 20, // 20% deposit
  paymentDeadline: 7, // 7 days before check-in
  vccExpiryDays: 30, // VCC expires in 30 days
  autoCloseCard: true,
  closeCardAfterDays: 1 // Close card 1 day after payment
};
```

### **VCC Generation Process**
```typescript
// Generate VCC with policy
const vccResult = await PaymentPolicyService.generateVCCWithPolicy(
  tenantId,
  bookingId,
  paymentPolicy,
  bookingAmount
);

// VCC details
const vccDetails = {
  cardNumber: '4111111111111111',
  cvv: '123',
  expiryMonth: '12',
  expiryYear: '2025',
  cardholderName: 'HOTEL BOOKING',
  amount: 60.00, // 20% of $300
  currency: 'USD',
  policyId: 'policy-123',
  autoClose: true,
  closeAfterDays: 1
};
```

### **Balance Management**
```typescript
// Update VCC balance after usage
const success = await PaymentPolicyService.updateVCCBalance(
  paymentId,
  usedAmount,
  tenantId
);

// Get VCC balance
const balance = await PaymentPolicyService.getVCCBalance(
  paymentId,
  tenantId
);

// Balance details
const balanceInfo = {
  cardId: 'payment-123',
  originalAmount: 60.00,
  currentBalance: 40.00,
  usedAmount: 20.00,
  currency: 'USD',
  status: 'active',
  createdAt: '2024-01-15T10:30:00Z'
};
```

## 🔄 **Synchronization Workflows**

### **Inventory Sync Workflow**
1. **Inventory Update** - Hotel updates room availability
2. **Sync Trigger** - System detects changes
3. **Channel Mapping** - Find external property/room IDs
4. **API Call** - Send data to channel manager
5. **Response Handling** - Process channel response
6. **Status Update** - Update sync status and timestamps

### **Booking Sync Workflow**
1. **Booking Creation** - New booking in system
2. **Policy Check** - Determine payment requirements
3. **VCC Generation** - Create virtual credit card
4. **Channel Sync** - Send booking to channel manager
5. **Payment Processing** - Handle VCC and payment
6. **Status Tracking** - Monitor booking status

### **VCC Management Workflow**
1. **Policy Application** - Apply payment policy to booking
2. **Amount Calculation** - Calculate required payment
3. **VCC Generation** - Create virtual credit card
4. **Balance Tracking** - Monitor card usage
5. **Auto-Closure** - Close card based on policy
6. **Reporting** - Generate usage analytics

## 📁 **Database Schema**

### **Channels Table**
```sql
CREATE TABLE channels (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500),
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    hotel_id VARCHAR(255),
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    sync_frequency INTEGER DEFAULT 3600
);
```

### **Channel Mappings Table**
```sql
CREATE TABLE channel_mappings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    channel_id UUID NOT NULL,
    property_id UUID NOT NULL,
    room_id UUID,
    external_property_id VARCHAR(255) NOT NULL,
    external_room_id VARCHAR(255),
    mapping_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending'
);
```

### **Payment Policies Table**
```sql
CREATE TABLE payment_policies (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    deposit_percentage DECIMAL(5, 2),
    deposit_amount DECIMAL(10, 2),
    payment_deadline INTEGER NOT NULL,
    vcc_expiry_days INTEGER DEFAULT 30,
    auto_close_card BOOLEAN DEFAULT true,
    close_card_after_days INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);
```

### **VCC Balances Table**
```sql
CREATE TABLE vcc_balances (
    id UUID PRIMARY KEY,
    payment_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    current_balance DECIMAL(10, 2) NOT NULL,
    used_amount DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active',
    closed_at TIMESTAMP
);
```

## 🚀 **API Endpoints**

### **Channel Management**
```http
# Get all channels
GET /api/v1/channels

# Create channel
POST /api/v1/channels
{
  "name": "SiteMinder Integration",
  "channelType": "siteminder",
  "apiEndpoint": "https://api.siteminder.com/v1",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "hotelId": "external-hotel-id"
}

# Test channel connection
POST /api/v1/channels/:id/test-connection

# Sync to channel
POST /api/v1/channels/:id/sync
{
  "syncType": "inventory"
}

# Pull bookings from channel
POST /api/v1/channels/:id/pull-bookings
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### **Payment Policies**
```http
# Get payment policies
GET /api/v1/payment-policies

# Create payment policy
POST /api/v1/payment-policies
{
  "name": "Standard Deposit Policy",
  "policyType": "deposit",
  "depositPercentage": 20,
  "paymentDeadline": 7,
  "vccExpiryDays": 30,
  "autoCloseCard": true,
  "closeCardAfterDays": 1
}

# Calculate payment amount
GET /api/v1/payment-policies/booking/:bookingId/calculate
```

### **VCC Management**
```http
# Generate VCC
POST /api/v1/payments/vcc/generate
{
  "bookingId": "booking-123",
  "amount": 60.00,
  "currency": "USD",
  "expiryDays": 30
}

# Send VCC to channel
POST /api/v1/payments/vcc/:id/send
{
  "channelId": "channel-123",
  "sendMethod": "api"
}

# Get VCC balance
GET /api/v1/vcc-balances/:id

# Update VCC balance
PUT /api/v1/vcc-balances/:id/update
{
  "usedAmount": 20.00
}

# Auto-close VCC cards
POST /api/v1/vcc-balances/auto-close
```

## 🔍 **Monitoring and Analytics**

### **Sync Status Tracking**
- **Last Sync Time** - When each channel was last synchronized
- **Sync Success Rate** - Percentage of successful syncs
- **Error Tracking** - Failed sync attempts and reasons
- **Performance Metrics** - Sync duration and throughput

### **VCC Analytics**
- **Card Usage** - Total cards generated and used
- **Balance Tracking** - Current balances and utilization
- **Auto-Closure** - Cards automatically closed
- **Policy Compliance** - Payment policy adherence

### **Channel Performance**
- **API Response Times** - Channel manager response times
- **Error Rates** - Failed API calls and retry attempts
- **Data Quality** - Sync accuracy and completeness
- **Cost Analysis** - Channel manager fees and costs

## 🛠️ **Configuration Examples**

### **SiteMinder Integration**
```typescript
const siteminderConfig = {
  name: 'SiteMinder Global',
  channelType: 'siteminder',
  apiEndpoint: 'https://api.siteminder.com/v1',
  apiKey: process.env.SITEMINDER_API_KEY,
  apiSecret: process.env.SITEMINDER_API_SECRET,
  hotelId: process.env.SITEMINDER_HOTEL_ID,
  configuration: {
    syncFrequency: 1800, // 30 minutes
    autoSync: true,
    retryAttempts: 3,
    timeout: 30000,
    rateLimit: 100 // requests per minute
  }
};
```

### **HotelRunner Integration**
```typescript
const hotelrunnerConfig = {
  name: 'HotelRunner Turkey',
  channelType: 'hotelrunner',
  apiEndpoint: 'https://api.hotelrunner.com/v2',
  apiKey: process.env.HOTELRUNNER_API_KEY,
  apiSecret: process.env.HOTELRUNNER_API_SECRET,
  hotelId: process.env.HOTELRUNNER_HOTEL_ID,
  configuration: {
    syncFrequency: 3600, // 1 hour
    autoSync: true,
    retryAttempts: 5,
    timeout: 45000,
    rateLimit: 50 // requests per minute
  }
};
```

## 🔒 **Security and Compliance**

### **Data Protection**
- **API Credentials** - Encrypted storage of channel credentials
- **VCC Security** - Secure virtual credit card generation
- **Data Encryption** - All sensitive data encrypted at rest
- **Access Control** - Role-based access to channel management

### **Compliance Features**
- **PCI DSS** - Payment card data security compliance
- **GDPR** - Data protection and privacy compliance
- **SOX** - Financial transaction audit trails
- **PCI Compliance** - Virtual credit card security standards

## 📊 **Performance Optimization**

### **Sync Optimization**
- **Batch Processing** - Group multiple updates for efficiency
- **Delta Sync** - Only sync changed data
- **Parallel Processing** - Multiple channels sync simultaneously
- **Retry Logic** - Intelligent retry with exponential backoff

### **VCC Optimization**
- **Batch Generation** - Generate multiple VCCs efficiently
- **Balance Pooling** - Optimize card balance management
- **Auto-Closure** - Automated card lifecycle management
- **Usage Analytics** - Real-time balance and usage tracking

---

**Note**: This Channel Manager integration provides comprehensive distribution channel management with automated inventory sync, booking management, and virtual credit card processing for the Hotel Extranet System.
