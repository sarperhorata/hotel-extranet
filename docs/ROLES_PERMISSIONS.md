# Roles & Permissions System

## Overview

The Hotel Extranet System implements a comprehensive role-based access control (RBAC) system with three predefined roles and granular permissions for different operations.

## 🎭 **Predefined Roles**

### 1. **Admin** (`admin`)
- **Full system access** - Can perform all operations
- **Tenant management** - Create, update, delete tenants
- **User management** - Create, update, delete users
- **System configuration** - Access to all settings
- **Financial operations** - Full access to payments and VCC
- **Channel management** - Full channel integration access

### 2. **Hotel Manager** (`hotel_manager`)
- **Property management** - Full CRUD operations on properties
- **Room management** - Full CRUD operations on rooms
- **Inventory management** - Full access to inventory and rates
- **Booking management** - Full access to bookings
- **Channel operations** - Can sync and manage channels
- **Payment operations** - Can generate and send VCC
- **Notification management** - Can send notifications

### 3. **Staff** (`staff`)
- **Read-only access** - Can view most data
- **Limited booking operations** - Can view and update bookings
- **Basic inventory access** - Can view inventory
- **No financial operations** - Cannot access payments
- **No channel management** - Cannot manage channels
- **No user management** - Cannot create/delete users

## 🔐 **Permission Matrix**

| Operation | Admin | Hotel Manager | Staff |
|-----------|-------|---------------|-------|
| **Authentication** |
| Login/Logout | ✅ | ✅ | ✅ |
| Profile Management | ✅ | ✅ | ✅ |
| **Tenant Management** |
| Create Tenant | ✅ | ❌ | ❌ |
| Update Tenant | ✅ | ❌ | ❌ |
| Delete Tenant | ✅ | ❌ | ❌ |
| View Tenants | ✅ | ❌ | ❌ |
| **User Management** |
| Create Users | ✅ | ❌ | ❌ |
| Update Users | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ |
| View Users | ✅ | ✅ | ❌ |
| **Property Management** |
| Create Properties | ✅ | ✅ | ❌ |
| Update Properties | ✅ | ✅ | ❌ |
| Delete Properties | ✅ | ✅ | ❌ |
| View Properties | ✅ | ✅ | ✅ |
| **Room Management** |
| Create Rooms | ✅ | ✅ | ❌ |
| Update Rooms | ✅ | ✅ | ❌ |
| Delete Rooms | ✅ | ✅ | ❌ |
| View Rooms | ✅ | ✅ | ✅ |
| **Inventory Management** |
| Update Inventory | ✅ | ✅ | ❌ |
| Bulk Update Inventory | ✅ | ✅ | ❌ |
| View Inventory | ✅ | ✅ | ✅ |
| **Rate Management** |
| Create Rate Plans | ✅ | ✅ | ❌ |
| Update Rate Plans | ✅ | ✅ | ❌ |
| Delete Rate Plans | ✅ | ✅ | ❌ |
| View Rate Plans | ✅ | ✅ | ✅ |
| **Booking Management** |
| Create Bookings | ✅ | ✅ | ❌ |
| Update Bookings | ✅ | ✅ | ✅ |
| Cancel Bookings | ✅ | ✅ | ✅ |
| View Bookings | ✅ | ✅ | ✅ |
| **Search Operations** |
| Search Availability | ✅ | ✅ | ✅ |
| View Search Results | ✅ | ✅ | ✅ |
| **Channel Management** |
| Create Channels | ✅ | ✅ | ❌ |
| Update Channels | ✅ | ✅ | ❌ |
| Delete Channels | ✅ | ✅ | ❌ |
| Sync Channels | ✅ | ✅ | ❌ |
| View Channels | ✅ | ✅ | ✅ |
| **Payment Operations** |
| Generate VCC | ✅ | ✅ | ❌ |
| Send VCC | ✅ | ✅ | ❌ |
| View Payments | ✅ | ✅ | ❌ |
| **Notification Management** |
| Send Notifications | ✅ | ✅ | ❌ |
| View Notifications | ✅ | ✅ | ✅ |
| **System Operations** |
| View Dashboard | ✅ | ✅ | ✅ |
| System Settings | ✅ | ❌ | ❌ |
| Logs Access | ✅ | ❌ | ❌ |

## 🛡️ **Authorization Implementation**

### **Middleware-Based Authorization**
```typescript
// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};
```

### **Route Protection Examples**
```typescript
// Admin and Hotel Manager only
router.post('/properties', authorize('admin', 'hotel_manager'), createProperty);

// Admin only
router.post('/tenants', authorize('admin'), createTenant);

// All authenticated users
router.get('/properties', authenticateToken, getProperties);
```

## 🔒 **Security Features**

### **JWT Token Structure**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'hotel_manager' | 'staff';
  tenantId: string;
  iat: number;
  exp: number;
}
```

### **Multi-Tenant Isolation**
- Each user belongs to a specific tenant
- All operations are automatically filtered by `tenant_id`
- Users can only access data within their tenant
- Cross-tenant access is prevented

### **Token Security**
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- **Secure Storage**: Refresh tokens stored in database
- **Automatic Cleanup**: Expired tokens are removed

## 📊 **Role Assignment**

### **Default Role Assignment**
- **New Tenants**: Admin role for first user
- **New Users**: Staff role by default
- **Role Updates**: Only admins can change roles

### **Role Hierarchy**
```
Admin (Highest)
    ↓
Hotel Manager
    ↓
Staff (Lowest)
```

## 🚀 **Usage Examples**

### **Creating a New User with Role**
```typescript
// Only admins can create users
router.post('/users', authorize('admin'), createUser);

// Role assignment during user creation
const userResult = await query(`
  INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id, email, first_name, last_name, role
`, [tenantId, email, hashedPassword, firstName, lastName, role, true]);
```

### **Checking Permissions in Controllers**
```typescript
// Check if user has admin role
if (req.user.role === 'admin') {
  // Admin-only operations
}

// Check if user can manage properties
if (['admin', 'hotel_manager'].includes(req.user.role)) {
  // Property management operations
}
```

### **Frontend Role-Based UI**
```typescript
// Hide/show UI elements based on role
{user.role === 'admin' && (
  <Button onClick={createUser}>Create User</Button>
)}

{['admin', 'hotel_manager'].includes(user.role) && (
  <Button onClick={createProperty}>Add Property</Button>
)}
```

## 🔧 **Configuration**

### **Environment Variables**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret
```

### **Database Schema**
```sql
-- Users table with role column
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, email)
);
```

## 📝 **Best Practices**

### **Security Guidelines**
1. **Always validate roles** before sensitive operations
2. **Use middleware** for consistent authorization
3. **Log permission denials** for security monitoring
4. **Regular token rotation** for enhanced security
5. **Multi-factor authentication** for admin accounts

### **Development Guidelines**
1. **Test all role combinations** in unit tests
2. **Document permission requirements** for each endpoint
3. **Use TypeScript enums** for role definitions
4. **Implement role-based UI components**
5. **Regular security audits** of permission matrix

## 🚨 **Security Considerations**

### **Common Vulnerabilities**
- **Privilege Escalation**: Users cannot elevate their own roles
- **Cross-Tenant Access**: Strict tenant isolation enforced
- **Token Hijacking**: Secure token storage and validation
- **Session Management**: Proper logout and token invalidation

### **Monitoring & Auditing**
- **Login Attempts**: Track failed authentication attempts
- **Permission Denials**: Log unauthorized access attempts
- **Role Changes**: Audit trail for role modifications
- **Sensitive Operations**: Log all admin operations

## 🔄 **Future Enhancements**

### **Planned Features**
- **Custom Roles**: Allow tenants to create custom roles
- **Granular Permissions**: Fine-grained permission system
- **Role Templates**: Predefined role templates for different hotel types
- **Permission Groups**: Group permissions for easier management
- **Time-based Access**: Temporary role assignments
- **API Key Management**: Service account authentication

### **Advanced Security**
- **Multi-Factor Authentication**: 2FA for admin accounts
- **IP Whitelisting**: Restrict access by IP address
- **Geolocation Restrictions**: Location-based access control
- **Device Management**: Track and manage user devices
- **Audit Logs**: Comprehensive activity logging

---

**Note**: This permission system is designed to be secure, scalable, and easy to maintain. All role checks are performed at the middleware level to ensure consistent security across the application.
