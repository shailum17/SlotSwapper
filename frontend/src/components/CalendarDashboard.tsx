import React, { useState, useEffect } from 'react';
import { Event, CreateEventRequest, UpdateEventRequest } from '../types';
import { useEvents, useStateManager } from '../contexts';
import { useNotification } from '../contexts/NotificationContext';
import EventCard from './EventCard';
import CreateEventModal from './CreateEventModal';
import LoadingSpinner from './LoadingSpinner';
import './CalendarDashboard.css';

const CalendarDashboard: React.FC = () => {
  const { 
    events, 
    isLoading, 
    error, 
    loadEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    clearError 
  } = useEvents();
  
  const { refreshMarketplace } = useStateManager();
  const { showSuccess, showError } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const setLoadingState = (key: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [key]: loading }));
  };

  const handleCreateEvent = async (eventData: CreateEventRequest) => {
    try {
      await createEvent(eventData);
      // Success notification is handled in the modal
    } catch (err: any) {
      throw err; // Re-throw to be handled by modal
    }
  };

  const handleUpdateEvent = async (eventData: UpdateEventRequest) => {
    if (!editingEvent) return;
    
    try {
      await updateEvent(editingEvent._id, eventData);
      
      // If status was changed, refresh marketplace to reflect availability
      if (eventData.status) {
        await refreshMarketplace();
      }
      // Success notification is handled in the modal
    } catch (err: any) {
      throw err; // Re-throw to be handled by modal
    }
  };

  const handleStatusToggle = async (eventId: string, newStatus: 'BUSY' | 'SWAPPABLE') => {
    const loadingKey = `status-${eventId}`;
    setLoadingState(loadingKey, true);
    
    try {
      await updateEvent(eventId, { status: newStatus });
      showSuccess(
        'Status Updated',
        `Event marked as ${newStatus.toLowerCase()}`
      );
      
      // Refresh marketplace when status changes to reflect availability
      await refreshMarketplace();
    } catch (err: any) {
      showError('Update Failed', 'Failed to update event status');
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const loadingKey = `delete-${eventId}`;
    setLoadingState(loadingKey, true);
    
    try {
      await deleteEvent(eventId);
      showSuccess('Event Deleted', 'Event has been removed from your calendar');
      
      // Refresh marketplace in case deleted event was swappable
      await refreshMarketplace();
    } catch (err: any) {
      showError('Delete Failed', 'Failed to delete event');
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (eventData: CreateEventRequest | UpdateEventRequest) => {
    if (editingEvent) {
      await handleUpdateEvent(eventData as UpdateEventRequest);
    } else {
      await handleCreateEvent(eventData as CreateEventRequest);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (isLoading) {
    return (
      <div className="calendar-dashboard">
        <div className="loading-container">
          <LoadingSpinner size="large" message="Loading your events..." />
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-dashboard">
      <div className="dashboard-header">
        <h2>Your Calendar</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="create-event-btn"
        >
          Create Event
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="dismiss-error">×</button>
        </div>
      )}

      <div className="events-container">
        {sortedEvents.length === 0 ? (
          <div className="empty-state">
            <h3>No events yet</h3>
            <p>Create your first event to get started with SlotSwapper!</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="create-first-event-btn"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {sortedEvents.map(event => (
              <EventCard
                key={event._id}
                event={event}
                onStatusToggle={handleStatusToggle}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                isStatusLoading={actionLoading[`status-${event._id}`]}
                isDeleteLoading={actionLoading[`delete-${event._id}`]}
              />
            ))}
          </div>
        )}
      </div>

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        editingEvent={editingEvent}
      />


    </div>
  );
};

export default CalendarDashboard;