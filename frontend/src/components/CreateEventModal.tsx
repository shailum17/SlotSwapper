import React, { useState, useEffect } from 'react';
import { Event, CreateEventRequest, UpdateEventRequest } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useFormValidation, commonValidationRules } from '../hooks/useFormValidation';
import { formatError } from '../utils/errorHandling';
import { LoadingSpinner } from './';
import './CreateEventModal.css';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: CreateEventRequest | UpdateEventRequest) => Promise<void>;
  editingEvent?: Event | null;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingEvent
}) => {
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const validationRules = {
    title: commonValidationRules.title,
    startTime: { required: true },
    endTime: {
      required: true,
      custom: (value: string) => {
        if (formData.startTime && value) {
          const startDate = new Date(formData.startTime);
          const endDate = new Date(value);
          if (startDate >= endDate) {
            return 'End time must be after start time';
          }
        }
        return null;
      },
    },
  };

  const { errors, validateForm, validateField, clearError, clearAllErrors } = useFormValidation(validationRules);

  // Reset form when modal opens/closes or editing event changes
  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        // Format dates for datetime-local input
        const formatForInput = (dateString: string) => {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16);
        };

        setFormData({
          title: editingEvent.title,
          startTime: formatForInput(editingEvent.startTime),
          endTime: formatForInput(editingEvent.endTime)
        });
      } else {
        setFormData({
          title: '',
          startTime: '',
          endTime: ''
        });
      }
      clearAllErrors();
    }
  }, [isOpen, editingEvent, clearAllErrors]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      clearError(name);
    }

    // Real-time validation for better UX
    if (value.trim()) {
      validateField(name, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      showError('Validation Error', 'Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString()
      };

      await onSubmit(eventData);
      showSuccess(
        editingEvent ? 'Event Updated' : 'Event Created',
        `Your event "${formData.title}" has been ${editingEvent ? 'updated' : 'created'} successfully.`
      );
      onClose();
    } catch (err: any) {
      const errorInfo = formatError(err);
      showError(errorInfo.title, errorInfo.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter event title"
              disabled={isLoading}
              className={errors.title ? 'error' : ''}
              aria-describedby={errors.title ? 'title-error' : undefined}
              required
            />
            {errors.title && (
              <span id="title-error" className="error-message" role="alert">
                {errors.title}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="startTime">Start Time *</label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              disabled={isLoading}
              className={errors.startTime ? 'error' : ''}
              aria-describedby={errors.startTime ? 'startTime-error' : undefined}
              required
            />
            {errors.startTime && (
              <span id="startTime-error" className="error-message" role="alert">
                {errors.startTime}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="endTime">End Time *</label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              disabled={isLoading}
              className={errors.endTime ? 'error' : ''}
              aria-describedby={errors.endTime ? 'endTime-error' : undefined}
              required
            />
            {errors.endTime && (
              <span id="endTime-error" className="error-message" role="alert">
                {errors.endTime}
              </span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`submit-button ${isLoading ? 'button-loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                editingEvent ? 'Update Event' : 'Create Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;