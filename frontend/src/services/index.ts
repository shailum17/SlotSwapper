import axios, { AxiosError, AxiosResponse } from 'axios';
import { LoginRequest, SignupRequest, AuthResponse, Event, CreateEventRequest, UpdateEventRequest, SwappableSlot, CreateSwapRequestRequest, SwapRequest, SwapRequestsResponse } from '../types';
import { extractErrorMessage, shouldRetry, delay, getRetryDelay } from '../utils/errorHandling';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear invalid token
      localStorage.removeItem('token');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
      
      return Promise.reject(error);
    }
    
    // Handle retry logic for network and server errors
    if (shouldRetry(error, originalRequest._retryCount || 0)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      const retryDelay = getRetryDelay(originalRequest._retryCount);
      await delay(retryDelay);
      
      return api(originalRequest);
    }
    
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: extractErrorMessage(error),
        data: error.response?.data,
      });
    }
    
    return Promise.reject(error);
  }
);

// Authentication service
export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    // Backend returns { success: true, data: { user, token } }
    return {
      success: response.data.success,
      user: response.data.data.user,
      token: response.data.data.token
    };
  },

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/signup', userData);
    // Backend returns { success: true, data: { user, token } }
    return {
      success: response.data.success,
      user: response.data.data.user,
      token: response.data.data.token
    };
  },

  async verifyToken(): Promise<AuthResponse> {
    const response = await api.get('/auth/verify');
    // Backend returns { success: true, data: { user } }, but we need { success: true, user, token }
    // The token is already in localStorage, so we'll get it from there
    const token = localStorage.getItem('token') || '';
    return {
      success: response.data.success,
      user: response.data.data.user,
      token: token
    };
  },
};

// Event service
export const eventService = {
  async getEvents(): Promise<Event[]> {
    const response = await api.get('/events');
    return response.data.data;
  },

  async createEvent(eventData: CreateEventRequest): Promise<Event> {
    const response = await api.post('/events', eventData);
    return response.data.data;
  },

  async updateEvent(id: string, eventData: UpdateEventRequest): Promise<Event> {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data.data;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/events/${id}`);
  },
};

// Marketplace service
export const marketplaceService = {
  async getSwappableSlots(): Promise<SwappableSlot[]> {
    const response = await api.get('/swappable-slots');
    // Transform the response to match our SwappableSlot interface
    return response.data.data.map((slot: any) => ({
      ...slot,
      owner: slot.userId // The backend populates userId with user info
    }));
  },

  async createSwapRequest(swapData: CreateSwapRequestRequest): Promise<SwapRequest> {
    const response = await api.post('/swap/request', swapData);
    return response.data.data.swapRequest;
  },
};

// Swap request service
export const swapRequestService = {
  async getSwapRequests(type?: 'all' | 'incoming' | 'outgoing', status?: string): Promise<SwapRequestsResponse> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    
    const response = await api.get(`/swap/requests?${params.toString()}`);
    return response.data.data;
  },

  async respondToSwapRequest(swapRequestId: string, action: 'accept' | 'reject'): Promise<any> {
    const response = await api.post(`/swap/response/${swapRequestId}`, { action });
    return response.data.data;
  },
};

export { api };