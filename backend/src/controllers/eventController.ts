import { Request, Response } from 'express';
import { Event, EventStatus, IEvent } from '../models/Event';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Get all events for the authenticated user
export const getEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const events = await Event.find({ userId })
      .sort({ startTime: 1 })
      .lean();

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch events'
      }
    });
  }
};

// Create a new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    const { title, startTime, endTime, status } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title, start time, and end time are required'
        }
      });
    }

    // Validate time format and logic
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format for start time or end time'
        }
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Start time must be before end time'
        }
      });
    }

    // Validate status if provided
    if (status && !Object.values(EventStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status. Must be one of: BUSY, SWAPPABLE, SWAP_PENDING'
        }
      });
    }

    const event = new Event({
      userId,
      title: title.trim(),
      startTime: start,
      endTime: end,
      status: status || EventStatus.BUSY
    });

    const savedEvent = await event.save();

    res.status(201).json({
      success: true,
      data: savedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    
    if (error instanceof Error && error.message.includes('Start time must be before end time')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create event'
      }
    });
  }
};

// Update an existing event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const eventId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid event ID'
        }
      });
    }

    // Find the event and verify ownership
    const existingEvent = await Event.findById(eventId);
    
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event not found'
        }
      });
    }

    if (existingEvent.userId.toString() !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only modify your own events'
        }
      });
    }

    const { title, startTime, endTime, status } = req.body;
    const updateData: Partial<IEvent> = {};

    // Validate and update title if provided
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title cannot be empty'
          }
        });
      }
      updateData.title = title.trim();
    }

    // Validate and update times if provided
    if (startTime !== undefined || endTime !== undefined) {
      const newStartTime = startTime ? new Date(startTime) : existingEvent.startTime;
      const newEndTime = endTime ? new Date(endTime) : existingEvent.endTime;

      if ((startTime && isNaN(newStartTime.getTime())) || (endTime && isNaN(newEndTime.getTime()))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format for start time or end time'
          }
        });
      }

      if (newStartTime >= newEndTime) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Start time must be before end time'
          }
        });
      }

      if (startTime) updateData.startTime = newStartTime;
      if (endTime) updateData.endTime = newEndTime;
    }

    // Validate and update status if provided
    if (status !== undefined) {
      if (!Object.values(EventStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status. Must be one of: BUSY, SWAPPABLE, SWAP_PENDING'
          }
        });
      }

      // Prevent status changes on events with SWAP_PENDING status
      if (existingEvent.status === EventStatus.SWAP_PENDING && status !== EventStatus.SWAP_PENDING) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot change status of events with SWAP_PENDING status'
          }
        });
      }

      updateData.status = status;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    
    if (error instanceof Error && error.message.includes('Start time must be before end time')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update event'
      }
    });
  }
};

// Delete an event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const eventId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid event ID'
        }
      });
    }

    // Find the event and verify ownership
    const existingEvent = await Event.findById(eventId);
    
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event not found'
        }
      });
    }

    if (existingEvent.userId.toString() !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own events'
        }
      });
    }

    await Event.findByIdAndDelete(eventId);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete event'
      }
    });
  }
};

// Get all swappable slots from other users
export const getSwappableSlots = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    // Find all swappable events from other users, excluding current user's slots
    const swappableSlots = await Event.find({
      status: EventStatus.SWAPPABLE,
      userId: { $ne: userId }
    })
    .populate('userId', 'name email')
    .sort({ startTime: 1 })
    .lean();

    res.json({
      success: true,
      data: swappableSlots
    });
  } catch (error) {
    console.error('Error fetching swappable slots:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch swappable slots'
      }
    });
  }
};