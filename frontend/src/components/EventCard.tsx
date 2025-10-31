import React from 'react';
import { Event } from '../types';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  onStatusToggle: (eventId: string, newStatus: 'BUSY' | 'SWAPPABLE') => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  isStatusLoading?: boolean;
  isDeleteLoading?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onStatusToggle, 
  onEdit, 
  onDelete, 
  isStatusLoading = false,
  isDeleteLoading = false 
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BUSY':
        return '#dc3545';
      case 'SWAPPABLE':
        return '#28a745';
      case 'SWAP_PENDING':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'BUSY':
        return 'Busy';
      case 'SWAPPABLE':
        return 'Swappable';
      case 'SWAP_PENDING':
        return 'Swap Pending';
      default:
        return status;
    }
  };

  const handleStatusToggle = () => {
    if (event.status === 'SWAP_PENDING' || isStatusLoading) return;
    
    const newStatus = event.status === 'BUSY' ? 'SWAPPABLE' : 'BUSY';
    onStatusToggle(event._id, newStatus);
  };

  const handleEdit = () => {
    if (isStatusLoading || isDeleteLoading) return;
    onEdit(event);
  };

  const handleDelete = () => {
    if (isDeleteLoading || isStatusLoading) return;
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(event._id);
    }
  };

  return (
    <div className="event-card">
      <div className="event-header">
        <h3 className="event-title">{event.title}</h3>
        <div 
          className="event-status"
          style={{ backgroundColor: getStatusColor(event.status) }}
        >
          {getStatusText(event.status)}
        </div>
      </div>
      
      <div className="event-time">
        <span className="time-label">Start:</span>
        <span className="time-value">{formatDateTime(event.startTime)}</span>
      </div>
      
      <div className="event-time">
        <span className="time-label">End:</span>
        <span className="time-value">{formatDateTime(event.endTime)}</span>
      </div>
      
      <div className="event-actions">
        <button
          onClick={handleStatusToggle}
          disabled={event.status === 'SWAP_PENDING' || isStatusLoading}
          className={`status-toggle-btn ${event.status === 'BUSY' ? 'make-swappable' : 'make-busy'} ${isStatusLoading ? 'loading' : ''}`}
        >
          {isStatusLoading ? 'Updating...' : 
           event.status === 'SWAP_PENDING' ? 'Swap Pending' :
           event.status === 'BUSY' ? 'Make Swappable' : 'Make Busy'}
        </button>
        
        <div className="action-buttons">
          <button 
            onClick={handleEdit} 
            className="edit-btn"
            disabled={isStatusLoading || isDeleteLoading}
          >
            Edit
          </button>
          <button 
            onClick={handleDelete} 
            className={`delete-btn ${isDeleteLoading ? 'loading' : ''}`}
            disabled={isDeleteLoading || isStatusLoading}
          >
            {isDeleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;