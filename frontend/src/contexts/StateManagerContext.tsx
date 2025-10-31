import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useEvents } from './EventContext';
import { useSwap } from './SwapContext';

// State manager context type
interface StateManagerContextType {
  refreshAll: () => Promise<void>;
  refreshAfterSwap: () => Promise<void>;
  refreshMarketplace: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

// Create context
const StateManagerContext = createContext<StateManagerContextType | undefined>(undefined);

// StateManagerProvider component
interface StateManagerProviderProps {
  children: ReactNode;
}

export const StateManagerProvider: React.FC<StateManagerProviderProps> = ({ children }) => {
  const { refreshEvents } = useEvents();
  const { loadSwappableSlots, loadSwapRequests, refreshAll: refreshSwapData } = useSwap();

  // Refresh all data across the application
  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      refreshEvents(),
      refreshSwapData(),
    ]);
  }, [refreshEvents, refreshSwapData]);

  // Refresh data after a successful swap (events + marketplace + notifications)
  const refreshAfterSwap = useCallback(async (): Promise<void> => {
    // After a swap, we need to refresh:
    // 1. User's events (ownership may have changed)
    // 2. Marketplace (slots may no longer be available)
    // 3. Swap requests (status updates)
    await Promise.all([
      refreshEvents(),
      loadSwappableSlots(),
      loadSwapRequests(),
    ]);
  }, [refreshEvents, loadSwappableSlots, loadSwapRequests]);

  // Refresh marketplace data
  const refreshMarketplace = useCallback(async (): Promise<void> => {
    await loadSwappableSlots();
  }, [loadSwappableSlots]);

  // Refresh notifications data
  const refreshNotifications = useCallback(async (): Promise<void> => {
    await loadSwapRequests();
  }, [loadSwapRequests]);

  // Set up automatic refresh intervals
  useEffect(() => {
    // Refresh marketplace every 30 seconds to catch new swappable slots
    const marketplaceInterval = setInterval(() => {
      refreshMarketplace();
    }, 30000);

    // Refresh notifications every 15 seconds to catch new requests
    const notificationsInterval = setInterval(() => {
      refreshNotifications();
    }, 15000);

    // Cleanup intervals on unmount
    return () => {
      clearInterval(marketplaceInterval);
      clearInterval(notificationsInterval);
    };
  }, [refreshMarketplace, refreshNotifications]);

  // Context value
  const contextValue: StateManagerContextType = {
    refreshAll,
    refreshAfterSwap,
    refreshMarketplace,
    refreshNotifications,
  };

  return (
    <StateManagerContext.Provider value={contextValue}>
      {children}
    </StateManagerContext.Provider>
  );
};

// Custom hook to use state manager context
export const useStateManager = (): StateManagerContextType => {
  const context = useContext(StateManagerContext);
  if (context === undefined) {
    throw new Error('useStateManager must be used within a StateManagerProvider');
  }
  return context;
};

export default StateManagerContext;