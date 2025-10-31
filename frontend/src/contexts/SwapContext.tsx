import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { SwappableSlot, SwapRequest, CreateSwapRequestRequest, PopulatedSwapRequest } from '../types';
import { marketplaceService, swapRequestService } from '../services';

// Swap state interface
interface SwapState {
  swappableSlots: SwappableSlot[];
  incomingRequests: PopulatedSwapRequest[];
  outgoingRequests: PopulatedSwapRequest[];
  isLoading: boolean;
  error: string | null;
}

// Swap context type
interface SwapContextType {
  swappableSlots: SwappableSlot[];
  incomingRequests: PopulatedSwapRequest[];
  outgoingRequests: PopulatedSwapRequest[];
  isLoading: boolean;
  error: string | null;
  loadSwappableSlots: () => Promise<void>;
  loadSwapRequests: () => Promise<void>;
  createSwapRequest: (swapData: CreateSwapRequestRequest) => Promise<SwapRequest>;
  respondToSwapRequest: (swapRequestId: string, action: 'accept' | 'reject') => Promise<any>;
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

// Swap actions
type SwapAction =
  | { type: 'SWAP_LOADING' }
  | { type: 'SWAPPABLE_SLOTS_LOADED'; payload: SwappableSlot[] }
  | { type: 'SWAP_REQUESTS_LOADED'; payload: { incoming: PopulatedSwapRequest[]; outgoing: PopulatedSwapRequest[] } }
  | { type: 'SWAP_REQUEST_CREATED'; payload: SwapRequest }
  | { type: 'SWAP_REQUEST_RESPONDED'; payload: { requestId: string; action: 'accept' | 'reject' } }
  | { type: 'SWAP_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: SwapState = {
  swappableSlots: [],
  incomingRequests: [],
  outgoingRequests: [],
  isLoading: false,
  error: null,
};

// Swap reducer
const swapReducer = (state: SwapState, action: SwapAction): SwapState => {
  switch (action.type) {
    case 'SWAP_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'SWAPPABLE_SLOTS_LOADED':
      return {
        ...state,
        swappableSlots: action.payload,
        isLoading: false,
        error: null,
      };
    case 'SWAP_REQUESTS_LOADED':
      return {
        ...state,
        incomingRequests: action.payload.incoming,
        outgoingRequests: action.payload.outgoing,
        isLoading: false,
        error: null,
      };
    case 'SWAP_REQUEST_CREATED':
      return {
        ...state,
        isLoading: false,
        error: null,
      };
    case 'SWAP_REQUEST_RESPONDED':
      return {
        ...state,
        incomingRequests: state.incomingRequests.map(request =>
          request._id === action.payload.requestId
            ? { ...request, status: action.payload.action === 'accept' ? 'ACCEPTED' : 'REJECTED' }
            : request
        ),
        isLoading: false,
        error: null,
      };
    case 'SWAP_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const SwapContext = createContext<SwapContextType | undefined>(undefined);

// SwapProvider component
interface SwapProviderProps {
  children: ReactNode;
}

export const SwapProvider: React.FC<SwapProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(swapReducer, initialState);

  // Load swappable slots function
  const loadSwappableSlots = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SWAP_LOADING' });
      const slots = await marketplaceService.getSwappableSlots();
      dispatch({ type: 'SWAPPABLE_SLOTS_LOADED', payload: slots });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to load swappable slots';
      dispatch({ type: 'SWAP_ERROR', payload: errorMessage });
    }
  }, []);

  // Load swap requests function
  const loadSwapRequests = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SWAP_LOADING' });
      const response = await swapRequestService.getSwapRequests('all');
      dispatch({
        type: 'SWAP_REQUESTS_LOADED',
        payload: {
          incoming: response.incoming || [],
          outgoing: response.outgoing || [],
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to load swap requests';
      dispatch({ type: 'SWAP_ERROR', payload: errorMessage });
    }
  }, []);

  // Create swap request function
  const createSwapRequest = useCallback(async (swapData: CreateSwapRequestRequest): Promise<SwapRequest> => {
    try {
      dispatch({ type: 'SWAP_LOADING' });
      const newSwapRequest = await marketplaceService.createSwapRequest(swapData);
      dispatch({ type: 'SWAP_REQUEST_CREATED', payload: newSwapRequest });
      return newSwapRequest;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create swap request';
      dispatch({ type: 'SWAP_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Respond to swap request function
  const respondToSwapRequest = useCallback(async (swapRequestId: string, action: 'accept' | 'reject'): Promise<any> => {
    try {
      dispatch({ type: 'SWAP_LOADING' });
      const response = await swapRequestService.respondToSwapRequest(swapRequestId, action);
      dispatch({ type: 'SWAP_REQUEST_RESPONDED', payload: { requestId: swapRequestId, action } });
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to respond to swap request';
      dispatch({ type: 'SWAP_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Clear error function
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Refresh all data function
  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      loadSwappableSlots(),
      loadSwapRequests(),
    ]);
  }, [loadSwappableSlots, loadSwapRequests]);

  // Context value
  const contextValue: SwapContextType = {
    swappableSlots: state.swappableSlots,
    incomingRequests: state.incomingRequests,
    outgoingRequests: state.outgoingRequests,
    isLoading: state.isLoading,
    error: state.error,
    loadSwappableSlots,
    loadSwapRequests,
    createSwapRequest,
    respondToSwapRequest,
    clearError,
    refreshAll,
  };

  return (
    <SwapContext.Provider value={contextValue}>
      {children}
    </SwapContext.Provider>
  );
};

// Custom hook to use swap context
export const useSwap = (): SwapContextType => {
  const context = useContext(SwapContext);
  if (context === undefined) {
    throw new Error('useSwap must be used within a SwapProvider');
  }
  return context;
};

export default SwapContext;