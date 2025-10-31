import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Event, CreateEventRequest, UpdateEventRequest } from '../types';
import { eventService } from '../services';

// Event state interface
interface EventState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

// Event context type
interface EventContextType {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  loadEvents: () => Promise<void>;
  createEvent: (eventData: CreateEventRequest) => Promise<Event>;
  updateEvent: (id: string, eventData: UpdateEventRequest) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  clearError: () => void;
  refreshEvents: () => Promise<void>;
}

// Event actions
type EventAction =
  | { type: 'EVENTS_LOADING' }
  | { type: 'EVENTS_LOADED'; payload: Event[] }
  | { type: 'EVENT_CREATED'; payload: Event }
  | { type: 'EVENT_UPDATED'; payload: Event }
  | { type: 'EVENT_DELETED'; payload: string }
  | { type: 'EVENTS_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: EventState = {
  events: [],
  isLoading: false,
  error: null,
};

// Event reducer
const eventReducer = (state: EventState, action: EventAction): EventState => {
  switch (action.type) {
    case 'EVENTS_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'EVENTS_LOADED':
      return {
        ...state,
        events: action.payload,
        isLoading: false,
        error: null,
      };
    case 'EVENT_CREATED':
      return {
        ...state,
        events: [...state.events, action.payload],
        isLoading: false,
        error: null,
      };
    case 'EVENT_UPDATED':
      return {
        ...state,
        events: state.events.map(event =>
          event._id === action.payload._id ? action.payload : event
        ),
        isLoading: false,
        error: null,
      };
    case 'EVENT_DELETED':
      return {
        ...state,
        events: state.events.filter(event => event._id !== action.payload),
        isLoading: false,
        error: null,
      };
    case 'EVENTS_ERROR':
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
const EventContext = createContext<EventContextType | undefined>(undefined);

// EventProvider component
interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(eventReducer, initialState);

  // Load events function
  const loadEvents = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'EVENTS_LOADING' });
      const events = await eventService.getEvents();
      dispatch({ type: 'EVENTS_LOADED', payload: events });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to load events';
      dispatch({ type: 'EVENTS_ERROR', payload: errorMessage });
    }
  }, []);

  // Create event function
  const createEvent = useCallback(async (eventData: CreateEventRequest): Promise<Event> => {
    try {
      dispatch({ type: 'EVENTS_LOADING' });
      const newEvent = await eventService.createEvent(eventData);
      dispatch({ type: 'EVENT_CREATED', payload: newEvent });
      return newEvent;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create event';
      dispatch({ type: 'EVENTS_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Update event function
  const updateEvent = useCallback(async (id: string, eventData: UpdateEventRequest): Promise<Event> => {
    try {
      dispatch({ type: 'EVENTS_LOADING' });
      const updatedEvent = await eventService.updateEvent(id, eventData);
      dispatch({ type: 'EVENT_UPDATED', payload: updatedEvent });
      return updatedEvent;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update event';
      dispatch({ type: 'EVENTS_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Delete event function
  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'EVENTS_LOADING' });
      await eventService.deleteEvent(id);
      dispatch({ type: 'EVENT_DELETED', payload: id });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete event';
      dispatch({ type: 'EVENTS_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Clear error function
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Refresh events function (alias for loadEvents for clarity)
  const refreshEvents = useCallback(async (): Promise<void> => {
    await loadEvents();
  }, [loadEvents]);

  // Context value
  const contextValue: EventContextType = {
    events: state.events,
    isLoading: state.isLoading,
    error: state.error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
    refreshEvents,
  };

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
};

// Custom hook to use event context
export const useEvents = (): EventContextType => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};

export default EventContext;