import React from 'react';
import { PopulatedSwapRequest } from '../types';
import './IncomingRequestCard.css';

interface IncomingRequestCardProps {
  request: PopulatedSwapRequest;
  onResponse: (swapRequestId: string, action: 'accept' | 'reject') => void;
  isLoading?: boolean;
}

const IncomingRequestCard: React.FC<IncomingRequestCardProps> = ({ 
  request, 
  onResponse, 
  isLoading = false 
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'ACCEPTED':
        return 'status-accepted';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  };

  const isPending = request.status === 'PENDING';

  return (
    <div className={`incoming-request-card ${!isPending ? 'completed' : ''}`}>
      <div className="request-header">
        <div className="requester-info">
          <h4>{request.requesterId.name}</h4>
          <span className="requester-email">{request.requesterId.email}</span>
        </div>
        <div className={`status-badge ${getStatusBadgeClass(request.status)}`}>
          {request.status}
        </div>
      </div>

      <div className="swap-details">
        <div className="slot-comparison">
          <div className="slot-info their-slot">
            <h5>They're offering:</h5>
            <div className="slot-card">
              <div className="slot-title">{request.requesterSlotId.title}</div>
              <div className="slot-time">
                {formatDateTime(request.requesterSlotId.startTime)} - {formatDateTime(request.requesterSlotId.endTime)}
              </div>
            </div>
          </div>

          <div className="swap-arrow">
            <span>⇄</span>
          </div>

          <div className="slot-info your-slot">
            <h5>For your slot:</h5>
            <div className="slot-card">
              <div className="slot-title">{request.targetSlotId.title}</div>
              <div className="slot-time">
                {formatDateTime(request.targetSlotId.startTime)} - {formatDateTime(request.targetSlotId.endTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="request-footer">
        <div className="request-date">
          Requested on {formatDateTime(request.createdAt)}
        </div>
        
        {isPending && (
          <div className="action-buttons">
            <button
              onClick={() => onResponse(request._id, 'reject')}
              className={`reject-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={() => onResponse(request._id, 'accept')}
              className={`accept-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Accept'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingRequestCard;