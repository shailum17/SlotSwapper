import React, { useState, useEffect } from 'react';
import { useSwap, useStateManager } from '../contexts';
import { useNotification } from '../contexts/NotificationContext';
import { IncomingRequestCard } from './';
import { OutgoingRequestCard } from './';
import LoadingSpinner from './LoadingSpinner';
import './NotificationsView.css';

const NotificationsView: React.FC = () => {
  const { 
    incomingRequests, 
    outgoingRequests, 
    isLoading, 
    error, 
    respondToSwapRequest, 
    clearError 
  } = useSwap();
  
  const { refreshNotifications, refreshAfterSwap } = useStateManager();
  const { showSuccess, showError } = useNotification();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwapResponse = async (swapRequestId: string, action: 'accept' | 'reject') => {
    setRespondingTo(prev => ({ ...prev, [swapRequestId]: true }));
    
    try {
      await respondToSwapRequest(swapRequestId, action);
      
      showSuccess(
        `Request ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
        `Swap request has been ${action}ed successfully!`
      );

      // If accepted, refresh all data since ownership changed
      // If rejected, just refresh notifications
      if (action === 'accept') {
        await refreshAfterSwap();
      } else {
        await refreshNotifications();
      }
    } catch (err: any) {
      showError(
        'Response Failed',
        err.message || `Failed to ${action} swap request`
      );
    } finally {
      setRespondingTo(prev => ({ ...prev, [swapRequestId]: false }));
    }
  };

  const pendingIncoming = incomingRequests.filter(req => req.status === 'PENDING');
  const completedIncoming = incomingRequests.filter(req => req.status !== 'PENDING');
  const pendingOutgoing = outgoingRequests.filter(req => req.status === 'PENDING');
  const completedOutgoing = outgoingRequests.filter(req => req.status !== 'PENDING');



  if (isLoading) {
    return (
      <div className="notifications-view">
        <div className="loading-container">
          <LoadingSpinner size="large" message="Loading notifications..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-view">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => { clearError(); refreshNotifications(); }} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-view">
      <div className="notifications-header">
        <h2>Notifications</h2>
        <button 
          onClick={handleRefresh} 
          className={`refresh-button ${isRefreshing ? 'loading' : ''}`}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="notifications-content">
        {/* Incoming Requests Section */}
        <section className="requests-section">
          <h3>Incoming Requests</h3>
          
          {pendingIncoming.length > 0 && (
            <div className="pending-requests">
              <h4>Pending ({pendingIncoming.length})</h4>
              <div className="requests-list">
                {pendingIncoming.map((request) => (
                  <IncomingRequestCard
                    key={request._id}
                    request={request}
                    onResponse={handleSwapResponse}
                    isLoading={respondingTo[request._id]}
                  />
                ))}
              </div>
            </div>
          )}

          {completedIncoming.length > 0 && (
            <div className="completed-requests">
              <h4>Recent Activity ({completedIncoming.length})</h4>
              <div className="requests-list">
                {completedIncoming.map((request) => (
                  <IncomingRequestCard
                    key={request._id}
                    request={request}
                    onResponse={handleSwapResponse}
                  />
                ))}
              </div>
            </div>
          )}

          {incomingRequests.length === 0 && (
            <div className="empty-state">
              <p>No incoming swap requests</p>
            </div>
          )}
        </section>

        {/* Outgoing Requests Section */}
        <section className="requests-section">
          <h3>Outgoing Requests</h3>
          
          {pendingOutgoing.length > 0 && (
            <div className="pending-requests">
              <h4>Pending ({pendingOutgoing.length})</h4>
              <div className="requests-list">
                {pendingOutgoing.map((request) => (
                  <OutgoingRequestCard
                    key={request._id}
                    request={request}
                  />
                ))}
              </div>
            </div>
          )}

          {completedOutgoing.length > 0 && (
            <div className="completed-requests">
              <h4>Recent Activity ({completedOutgoing.length})</h4>
              <div className="requests-list">
                {completedOutgoing.map((request) => (
                  <OutgoingRequestCard
                    key={request._id}
                    request={request}
                  />
                ))}
              </div>
            </div>
          )}

          {outgoingRequests.length === 0 && (
            <div className="empty-state">
              <p>No outgoing swap requests</p>
            </div>
          )}
        </section>
      </div>


    </div>
  );
};

export default NotificationsView;