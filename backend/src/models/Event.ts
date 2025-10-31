import mongoose, { Document, Schema } from 'mongoose';

export enum EventStatus {
  BUSY = 'BUSY',
  SWAPPABLE = 'SWAPPABLE',
  SWAP_PENDING = 'SWAP_PENDING'
}

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    index: true
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  status: {
    type: String,
    enum: {
      values: Object.values(EventStatus),
      message: 'Status must be one of: BUSY, SWAPPABLE, SWAP_PENDING'
    },
    default: EventStatus.BUSY,
    index: true
  }
}, {
  timestamps: true
});

// Validation to ensure start time is before end time
eventSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    next(new Error('Start time must be before end time'));
  } else {
    next();
  }
});

// Validation to ensure start time is before end time on updates
eventSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update.startTime && update.endTime) {
    if (new Date(update.startTime) >= new Date(update.endTime)) {
      next(new Error('Start time must be before end time'));
    }
  }
  next();
});

// Compound indexes for efficient queries
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ status: 1, startTime: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);