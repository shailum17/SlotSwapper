import mongoose, { Document, Schema } from 'mongoose';

export enum SwapRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export interface ISwapRequest extends Document {
  _id: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  requesterSlotId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  targetSlotId: mongoose.Types.ObjectId;
  status: SwapRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const swapRequestSchema = new Schema<ISwapRequest>({
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required'],
    index: true
  },
  requesterSlotId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Requester slot ID is required']
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Target user ID is required'],
    index: true
  },
  targetSlotId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Target slot ID is required']
  },
  status: {
    type: String,
    enum: {
      values: Object.values(SwapRequestStatus),
      message: 'Status must be one of: PENDING, ACCEPTED, REJECTED'
    },
    default: SwapRequestStatus.PENDING,
    index: true
  }
}, {
  timestamps: true
});

// Validation to ensure requester and target are different users
swapRequestSchema.pre('save', function(next) {
  if (this.requesterId.equals(this.targetUserId)) {
    next(new Error('Cannot create swap request with yourself'));
  } else {
    next();
  }
});

// Validation to ensure requester and target slots are different
swapRequestSchema.pre('save', function(next) {
  if (this.requesterSlotId.equals(this.targetSlotId)) {
    next(new Error('Cannot swap a slot with itself'));
  } else {
    next();
  }
});

// Compound indexes for efficient queries
swapRequestSchema.index({ requesterId: 1, status: 1 });
swapRequestSchema.index({ targetUserId: 1, status: 1 });
swapRequestSchema.index({ requesterSlotId: 1, targetSlotId: 1 }, { unique: true });

export const SwapRequest = mongoose.model<ISwapRequest>('SwapRequest', swapRequestSchema);