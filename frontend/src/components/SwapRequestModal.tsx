import React, { useState } from 'react';
import { SwappableSlot, Event } from '../types';
import './SwapRequestModal.css';

interface SwapRequestModalProps {
  targetSlot: SwappableSlot;
  userSwappableEvents: Event[];
  onSubmit: (requesterSlotId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const SwapRequestModal: React.FC<SwapRequestModalProps> = ({
  targetSlot,
  userSwappableEvents,
  onSubmit,
  onClose,
  isLoading = false
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlotId || isLoading) {
      return;
    }

    onSubmit(selectedSlotId);
  };

  const targetStartTime = formatDateTime(targetSlot.startTime);
  const targetEndTime = formatDateTime(targetSlot.endTime);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="swap-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Slot Swap</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="target-slot-info">
            <h3>Requesting Slot:</h3>
            <div className="slot-details">
              <p><strong>{targetSlot.title}</strong></p>
              <p>Owner: {targetSlot.owner.name}</p>
              <p>
                {targetStartTime.date} at {targetStartTime.time} - {targetEndTime.time}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="offered-slot">Select your slot to offer in exchange:</label>
              {userSwappableEvents.length === 0 ? (
                <div className="no-slots-available">
                  <p>You don't have any swappable slots available.</p>
                  <p>Go to your calendar and mark some events as swappable first.</p>
                </div>
              ) : (
                <select
                  id="offered-slot"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  required
                  className="slot-select"
                >
                  <option value="">Choose a slot to offer...</option>
                  {userSwappableEvents.map((event) => {
                    const startTime = formatDateTime(event.startTime);
                    const endTime = formatDateTime(event.endTime);
                    return (
                      <option key={event._id} value={event._id}>
                        {event.title} - {startTime.date} at {startTime.time} - {endTime.time}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`submit-button ${isLoading ? 'loading' : ''}`}
                disabled={!selectedSlotId || isLoading || userSwappableEvents.length === 0}
              >
                {isLoading ? 'Sending Request...' : 'Send Swap Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SwapRequestModal;