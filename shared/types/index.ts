// Shared TypeScript types for BusGo platform

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'passenger' | 'driver' | 'admin';
  createdAt: Date;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  phone: string;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  user?: User;
}

// Bus types
export interface Bus {
  id: string;
  driverId: string;
  name: string;
  plateNumber: string;
  capacity: number;
  type: 'standard' | 'deluxe' | 'tourist';
  approved: boolean;
  amenities?: string[];
  driver?: Driver;
}

// Route types
export interface Route {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedTime: number; // in minutes
  baseFare: number;
  waypoints?: string[];
}

// Schedule types
export interface Schedule {
  id: string;
  busId: string;
  routeId: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  availableSeats: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  bus?: Bus;
  route?: Route;
}

// Booking types
export type SeatStatus = 'available' | 'selected' | 'booked';

export interface Seat {
  id: string;
  name: string; // e.g., "1A", "1B", "2A", "2B"
  row: number;
  column: 'A' | 'B'; // A = driver side (right), B = door side (left)
  status: SeatStatus;
}

export interface Booking {
  id: string;
  userId: string;
  scheduleId: string;
  seats: string[]; // Array of seat names
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  user?: User;
  schedule?: Schedule;
}

// Payment types
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  stripePaymentId?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Search types
export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers?: number;
}

export interface SearchResult {
  schedule: Schedule;
  availableSeats: number;
  price: number;
}
