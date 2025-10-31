import React, { useState, useEffect } from 'react';
import { SwappableSlot } from '../types';
import { useSwap, useEvents, useStateManager } from '../contexts';
import { useNotification } from '../contexts/NotificationContext';
import SwappableSlotCard from './SwappableSlotCard';
import SwapRequestModal from './SwapRequestModal';
import LoadingSpinner from './LoadingSpinner';
import './MarketplaceView.css';

const MarketplaceView: React.FC = () => {
  const { 
    swappableSlots, 
    isLoading, 
    error, 
    createSwapRequest, 
    clearError 
  } = useSwap();
  
  const { events: userEvents } = useEvents();
  const { refreshMarketplace, refreshAfterSwap } = useStateManager();
  const { showSuccess, showError } = useNotification();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SwappableSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestingSwap, setRequestingSwap] = useState(false);

  // Load initial data when component mounts
  useEffect(() => {
    refreshMarketplace();
  }, [refreshMarketplace]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMarketplace();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRequestSwap = (slot: SwappableSlot) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleSwapRequestSubmit = async (requesterSlotId: string) => {
    if (!selectedSlot || requestingSwap) return;

    setRequestingSwap(true);
    try {
      await createSwapRequest({
        requesterSlotId,
        targetSlotId: selectedSlot._id
      });

      showSuccess(
        'Swap Request Sent',
        `Your swap request for "${selectedSlot.title}" has been sent successfully!`
      );
      setIsModalOpen(false);
      setSelectedSlot(null);
      
      // Refresh all related data after creating swap request
      await refreshAfterSwap();
    } catch (err: any) {
      showError(
        'Request Failed',
        err.message || 'Failed to send swap request'
      );
    } finally {
      setRequestingSwap(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  // Get user's swappable events for the modal
  const userSwappableEvents = userEvents.filter(event => event.status === 'SWAPPABLE');

  if (isLoading) {
    return (
      <div className="marketplace-view">
        <div className="loading-container">
          <LoadingSpinner size="large" message="Loading marketplace..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-view">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => { clearError(); refreshMarketplace(); }} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-view">
      <div className="marketplace-header">
        <h2>Available Slots</h2>
        <p>Find and request swaps with other users' available time slots</p>
        <button 
          onClick={handleManualRefresh} 
          className={`refresh-button ${isRefreshing ? 'loading' : ''}`}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {swappableSlots.length === 0 ? (
        <div className="empty-state">
          <p>No swappable slots available at the moment.</p>
          <p>Check back later or encourage others to mark their slots as swappable!</p>
        </div>
      ) : (
        <div className="slots-grid">
          {swappableSlots.map((slot) => (
            <SwappableSlotCard
              key={slot._id}
              slot={slot}
              onRequestSwap={handleRequestSwap}
              hasSwappableSlots={userSwappableEvents.length > 0}
            />
          ))}
        </div>
      )}

      {isModalOpen && selectedSlot && (
        <SwapRequestModal
          targetSlot={selectedSlot}
          userSwappableEvents={userSwappableEvents}
          onSubmit={handleSwapRequestSubmit}
          onClose={handleModalClose}
          isLoading={requestingSwap}
        />
      )}
    </div>
  );
};

export default MarketplaceView;