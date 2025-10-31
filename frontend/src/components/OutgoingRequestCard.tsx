import React from 'react';
import { PopulatedSwapRequest } from '../types';
import './OutgoingRequestCard.css';

interface OutgoingRequestCardProps {
  request: PopulatedSwapRequest;
}

const OutgoingRequestCard: React.FC<OutgoingRequestCardProps> = ({ request }) => {
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

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting for response...';
      case 'ACCEPTED':
        return 'Swap completed successfully!';
      case 'REJECTED':
        return 'Request was declined';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`outgoing-request-card ${request.status.toLowerCase()}`}>
      <div className="request-header">
        <div className="target-info">
          <h4>Request to {request.targetUserId.name}</h4>
          <span className="target-email">{request.targetUserId.email}</span>
        </div>
        <div className={`status-badge ${getStatusBadgeClass(request.status)}`}>
          {request.status}
        </div>
      </div>

      <div className="swap-details">
        <div className="slot-comparison">
          <div className="slot-info your-slot">
            <h5>You offered:</h5>
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

          <div className="slot-info their-slot">
            <h5>For their slot:</h5>
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
        <div className="request-info">
          <div className="request-date">
            Sent on {formatDateTime(request.createdAt)}
          </div>
          <div className="status-message">
            {getStatusMessage(request.status)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutgoingRequestCard;