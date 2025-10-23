export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'hotel_manager' | 'staff';
  isActive: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  roomType: string;
  description?: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  images: string[];
  bedType?: string;
  size?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RatePlan {
  id: string;
  tenantId: string;
  propertyId: string;
  name: string;
  description?: string;
  planType: 'standard' | 'member' | 'corporate' | 'promo';
  basePrice: number;
  currency: string;
  isDynamic: boolean;
  dynamicRules?: Record<string, any>;
  restrictions?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomInventory {
  id: string;
  tenantId: string;
  roomId: string;
  ratePlanId: string;
  date: string;
  availableRooms: number;
  totalRooms: number;
  price: number;
  currency: string;
  minStay?: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
  restrictions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  ratePlanId: string;
  guestId?: string;
  bookingReference: string;
  channel: string;
  channelBookingId?: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  rooms: number;
  totalNights: number;
  basePrice: number;
  taxes: number;
  fees: number;
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: string;
  specialRequests?: string;
  guestInfo?: Record<string, any>;
  cancellationPolicy?: string;
  cancellationDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  channelType: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  hotelId?: string;
  configuration?: Record<string, any>;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncFrequency: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  bookingId: string;
  channelId?: string;
  paymentType: 'vcc' | 'credit_card' | 'bank_transfer';
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'generated' | 'sent' | 'confirmed' | 'failed' | 'cancelled';
  vccDetails?: Record<string, any>;
  channelResponse?: Record<string, any>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  type: 'booking_confirmation' | 'booking_cancellation' | 'payment_confirmation' | 'inventory_alert' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  email?: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface PropertyForm {
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  images: string[];
  latitude?: number;
  longitude?: number;
}

export interface RoomForm {
  name: string;
  roomType: string;
  description?: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  images: string[];
  bedType?: string;
  size?: number;
}

export interface RatePlanForm {
  name: string;
  description?: string;
  planType: 'standard' | 'member' | 'corporate' | 'promo';
  basePrice: number;
  currency: string;
  isDynamic: boolean;
  dynamicRules?: Record<string, any>;
  restrictions?: Record<string, any>;
}

export interface BookingForm {
  propertyId: string;
  roomId: string;
  ratePlanId: string;
  guestId?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  rooms: number;
  guestInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    nationality?: string;
  };
  specialRequests?: string;
  channel?: string;
}

// Search types
export interface SearchCriteria {
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  rooms: number;
  propertyId?: string;
  city?: string;
  country?: string;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sortBy?: 'price' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  property: {
    id: string;
    name: string;
    starRating: number;
    address: string;
    city: string;
    country: string;
    amenities: string[];
    images: string[];
  };
  room: {
    id: string;
    name: string;
    roomType: string;
    maxOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    amenities: string[];
    images: string[];
  };
  minAvailableRooms: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  minStay?: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  ratePlans: Array<{
    ratePlanId: string;
    ratePlanName: string;
    planType: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  }>;
  totalPrice: number;
  totalNights: number;
}

// Dashboard types
export interface DashboardStats {
  totalProperties: number;
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
  recentBookings: Booking[];
  recentNotifications: Notification[];
  occupancyRate: number;
  averageDailyRate: number;
}

// Filter types
export interface PropertyFilters {
  city?: string;
  country?: string;
  starRating?: number;
  isActive?: boolean;
  search?: string;
}

export interface BookingFilters {
  status?: string;
  channel?: string;
  propertyId?: string;
  roomId?: string;
  guestId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  search?: string;
}

export interface InventoryFilters {
  propertyId?: string;
  roomId?: string;
  ratePlanId?: string;
  startDate?: string;
  endDate?: string;
}

// Context types
export interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  login: (credentials: LoginForm) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface TenantContextType {
  currentTenant: Tenant | null;
  switchTenant: (tenantId: string) => void;
}

export interface SocketContextType {
  socket: any;
  isConnected: boolean;
  notifications: Notification[];
  sendNotification: (notification: Omit<Notification, 'id' | 'tenantId' | 'createdAt'>) => void;
}
