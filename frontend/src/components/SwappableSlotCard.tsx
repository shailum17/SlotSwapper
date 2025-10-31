import React from 'react';
import { SwappableSlot } from '../types';
import './SwappableSlotCard.css';

interface SwappableSlotCardProps {
  slot: SwappableSlot;
  onRequestSwap: (slot: SwappableSlot) => void;
  hasSwappableSlots: boolean;
}

const SwappableSlotCard: React.FC<SwappableSlotCardProps> = ({
  slot,
  onRequestSwap,
  hasSwappableSlots
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startDateTime = formatDateTime(slot.startTime);
  const endDateTime = formatDateTime(slot.endTime);

  const handleRequestSwap = () => {
    onRequestSwap(slot);
  };

  return (
    <div className="swappable-slot-card">
      <div className="slot-header">
        <h3 className="slot-title">{slot.title}</h3>
        <div className="slot-status">
          <span className="status-badge swappable">Swappable</span>
        </div>
      </div>

      <div className="slot-details">
        <div className="time-info">
          <div className="time-row">
            <span className="time-label">Start:</span>
            <span className="time-value">
              {startDateTime.date} at {startDateTime.time}
            </span>
          </div>
          <div className="time-row">
            <span className="time-label">End:</span>
            <span className="time-value">
              {endDateTime.date} at {endDateTime.time}
            </span>
          </div>
        </div>

        <div className="owner-info">
          <span className="owner-label">Owner:</span>
          <span className="owner-name">{slot.owner.name}</span>
        </div>
      </div>

      <div className="slot-actions">
        {hasSwappableSlots ? (
          <button 
            onClick={handleRequestSwap}
            className="request-swap-button"
          >
            Request Swap
          </button>
        ) : (
          <div className="no-slots-message">
            <p>You need swappable slots to request swaps</p>
            <small>Mark some of your events as swappable first</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwappableSlotCard;