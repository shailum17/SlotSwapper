// User and Authentication Types
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Event Types
export interface Event {
  _id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  startTime: string;
  endTime: string;
}

export interface UpdateEventRequest {
  title?: string;
  startTime?: string;
  endTime?: string;
  status?: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
}

// Swap Request Types
export interface SwapRequest {
  _id: string;
  requesterId: string;
  requesterSlotId: string;
  targetUserId: string;
  targetSlotId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface SwappableSlot extends Event {
  owner: User;
}

export interface CreateSwapRequestRequest {
  requesterSlotId: string;
  targetSlotId: string;
}

// Extended swap request with populated data for notifications
export interface PopulatedSwapRequest {
  _id: string;
  requesterId: User;
  requesterSlotId: Event;
  targetUserId: User;
  targetSlotId: Event;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequestsResponse {
  incoming?: PopulatedSwapRequest[];
  outgoing?: PopulatedSwapRequest[];
  total: {
    incoming?: number;
    outgoing?: number;
    all?: number;
  };
}

export interface SwapResponseRequest {
  action: 'accept' | 'reject';
}