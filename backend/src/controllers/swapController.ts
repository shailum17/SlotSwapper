import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event, EventStatus } from '../models/Event';
import { SwapRequest, SwapRequestStatus } from '../models/SwapRequest';

export const createSwapRequest = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { requesterSlotId, targetSlotId } = req.body;
      const requesterId = req.user?._id.toString();

      if (!requesterId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Validate input
      if (!requesterSlotId || !targetSlotId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Both requesterSlotId and targetSlotId are required'
          }
        });
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(requesterSlotId) || !mongoose.Types.ObjectId.isValid(targetSlotId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID_FORMAT',
            message: 'Invalid slot ID format'
          }
        });
      }

      // Fetch both slots with session for transaction consistency
      const [requesterSlot, targetSlot] = await Promise.all([
        Event.findById(requesterSlotId).session(session),
        Event.findById(targetSlotId).session(session)
      ]);

      // Verify both slots exist
      if (!requesterSlot || !targetSlot) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SLOT_NOT_FOUND',
            message: 'One or both slots not found'
          }
        });
      }

      // Verify requester owns their slot
      if (requesterSlot.userId.toString() !== requesterId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_SLOT_ACCESS',
            message: 'You can only offer your own slots for swap'
          }
        });
      }

      // Verify requester doesn't own target slot (can't swap with yourself)
      if (targetSlot.userId.toString() === requesterId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SELF_SWAP_ATTEMPT',
            message: 'Cannot create swap request with your own slot'
          }
        });
      }

      // Verify both slots are SWAPPABLE
      if (requesterSlot.status !== EventStatus.SWAPPABLE) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUESTER_SLOT_STATUS',
            message: 'Your slot must be SWAPPABLE to create a swap request'
          }
        });
      }

      if (targetSlot.status !== EventStatus.SWAPPABLE) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TARGET_SLOT_STATUS',
            message: 'Target slot must be SWAPPABLE to create a swap request'
          }
        });
      }

      // Check if there's already a pending swap request for these slots
      const existingRequest = await SwapRequest.findOne({
        $or: [
          { requesterSlotId, targetSlotId },
          { requesterSlotId: targetSlotId, targetSlotId: requesterSlotId }
        ],
        status: SwapRequestStatus.PENDING
      }).session(session);

      if (existingRequest) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SWAP_REQUEST',
            message: 'A pending swap request already exists for these slots'
          }
        });
      }

      // Update both slots to SWAP_PENDING status atomically
      await Promise.all([
        Event.findByIdAndUpdate(
          requesterSlotId,
          { status: EventStatus.SWAP_PENDING },
          { session, new: true }
        ),
        Event.findByIdAndUpdate(
          targetSlotId,
          { status: EventStatus.SWAP_PENDING },
          { session, new: true }
        )
      ]);

      // Create the swap request
      const swapRequest = new SwapRequest({
        requesterId: new mongoose.Types.ObjectId(requesterId),
        requesterSlotId: new mongoose.Types.ObjectId(requesterSlotId),
        targetUserId: targetSlot.userId,
        targetSlotId: new mongoose.Types.ObjectId(targetSlotId),
        status: SwapRequestStatus.PENDING
      });

      await swapRequest.save({ session });

      // Populate the swap request with slot and user details for response
      const populatedRequest = await SwapRequest.findById(swapRequest._id)
        .populate('requesterId', 'name email')
        .populate('requesterSlotId', 'title startTime endTime status')
        .populate('targetUserId', 'name email')
        .populate('targetSlotId', 'title startTime endTime status')
        .session(session);

      res.status(201).json({
        success: true,
        data: {
          swapRequest: populatedRequest
        }
      });
    });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create swap request'
      }
    });
  } finally {
    await session.endSession();
  }
};

export const respondToSwapRequest = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id: swapRequestId } = req.params;
      const { action } = req.body; // 'accept' or 'reject'
      const userId = req.user?._id.toString();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Validate input
      if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be either "accept" or "reject"'
          }
        });
      }

      // Validate swap request ID format
      if (!mongoose.Types.ObjectId.isValid(swapRequestId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID_FORMAT',
            message: 'Invalid swap request ID format'
          }
        });
      }

      // Find the swap request with populated slot details
      const swapRequest = await SwapRequest.findById(swapRequestId)
        .populate('requesterSlotId')
        .populate('targetSlotId')
        .session(session);

      if (!swapRequest) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SWAP_REQUEST_NOT_FOUND',
            message: 'Swap request not found'
          }
        });
      }

      // Verify the user is the target user (owner of the target slot)
      if (swapRequest.targetUserId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_RESPONSE',
            message: 'You can only respond to swap requests for your own slots'
          }
        });
      }

      // Verify the swap request is still pending
      if (swapRequest.status !== SwapRequestStatus.PENDING) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST_STATUS',
            message: `Cannot respond to swap request with status: ${swapRequest.status}`
          }
        });
      }

      // Get the actual slot documents
      const requesterSlot = swapRequest.requesterSlotId as any;
      const targetSlot = swapRequest.targetSlotId as any;

      // Verify both slots are still in SWAP_PENDING status
      if (requesterSlot.status !== EventStatus.SWAP_PENDING || targetSlot.status !== EventStatus.SWAP_PENDING) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SLOT_STATUS',
            message: 'One or both slots are no longer in SWAP_PENDING status'
          }
        });
      }

      if (action === 'reject') {
        // Handle rejection: revert both slots to SWAPPABLE status
        await Promise.all([
          Event.findByIdAndUpdate(
            requesterSlot._id,
            { status: EventStatus.SWAPPABLE },
            { session, new: true }
          ),
          Event.findByIdAndUpdate(
            targetSlot._id,
            { status: EventStatus.SWAPPABLE },
            { session, new: true }
          )
        ]);

        // Update swap request status to REJECTED
        swapRequest.status = SwapRequestStatus.REJECTED;
        await swapRequest.save({ session });

        res.json({
          success: true,
          data: {
            message: 'Swap request rejected successfully',
            swapRequest: {
              _id: swapRequest._id,
              status: swapRequest.status,
              updatedAt: swapRequest.updatedAt
            }
          }
        });

      } else if (action === 'accept') {
        // Handle acceptance: swap ownership and set both slots to BUSY
        const requesterUserId = swapRequest.requesterId;
        const targetUserId = swapRequest.targetUserId;

        // Swap the ownership of the slots
        await Promise.all([
          Event.findByIdAndUpdate(
            requesterSlot._id,
            { 
              userId: targetUserId,
              status: EventStatus.BUSY 
            },
            { session, new: true }
          ),
          Event.findByIdAndUpdate(
            targetSlot._id,
            { 
              userId: requesterUserId,
              status: EventStatus.BUSY 
            },
            { session, new: true }
          )
        ]);

        // Update swap request status to ACCEPTED
        swapRequest.status = SwapRequestStatus.ACCEPTED;
        await swapRequest.save({ session });

        res.json({
          success: true,
          data: {
            message: 'Swap request accepted successfully',
            swapRequest: {
              _id: swapRequest._id,
              status: swapRequest.status,
              updatedAt: swapRequest.updatedAt
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('Error responding to swap request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to respond to swap request'
      }
    });
  } finally {
    await session.endSession();
  }
};

export const getSwapRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get query parameters for filtering
    const { status, type } = req.query;

    // Build base query conditions
    let baseQuery: any = {};
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      if (!Object.values(SwapRequestStatus).includes(status as SwapRequestStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status filter. Must be one of: PENDING, ACCEPTED, REJECTED'
          }
        });
      }
      baseQuery.status = status;
    }

    // Build queries for incoming and outgoing requests
    const incomingQuery = {
      ...baseQuery,
      targetUserId: new mongoose.Types.ObjectId(userId)
    };

    const outgoingQuery = {
      ...baseQuery,
      requesterId: new mongoose.Types.ObjectId(userId)
    };

    // Determine which requests to fetch based on type parameter
    let queries: any[] = [];
    
    if (!type || type === 'all') {
      // Fetch both incoming and outgoing requests
      queries = [
        SwapRequest.find(incomingQuery)
          .populate('requesterId', 'name email')
          .populate('requesterSlotId', 'title startTime endTime status')
          .populate('targetUserId', 'name email')
          .populate('targetSlotId', 'title startTime endTime status')
          .sort({ createdAt: -1 }),
        SwapRequest.find(outgoingQuery)
          .populate('requesterId', 'name email')
          .populate('requesterSlotId', 'title startTime endTime status')
          .populate('targetUserId', 'name email')
          .populate('targetSlotId', 'title startTime endTime status')
          .sort({ createdAt: -1 })
      ];
    } else if (type === 'incoming') {
      // Fetch only incoming requests (where user is the target)
      queries = [
        SwapRequest.find(incomingQuery)
          .populate('requesterId', 'name email')
          .populate('requesterSlotId', 'title startTime endTime status')
          .populate('targetUserId', 'name email')
          .populate('targetSlotId', 'title startTime endTime status')
          .sort({ createdAt: -1 })
      ];
    } else if (type === 'outgoing') {
      // Fetch only outgoing requests (where user is the requester)
      queries = [
        SwapRequest.find(outgoingQuery)
          .populate('requesterId', 'name email')
          .populate('requesterSlotId', 'title startTime endTime status')
          .populate('targetUserId', 'name email')
          .populate('targetSlotId', 'title startTime endTime status')
          .sort({ createdAt: -1 })
      ];
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid type filter. Must be one of: all, incoming, outgoing'
        }
      });
    }

    // Execute queries
    const results = await Promise.all(queries);

    let responseData: any = {};

    if (!type || type === 'all') {
      // Return both incoming and outgoing requests
      responseData = {
        incoming: results[0] || [],
        outgoing: results[1] || [],
        total: {
          incoming: results[0]?.length || 0,
          outgoing: results[1]?.length || 0,
          all: (results[0]?.length || 0) + (results[1]?.length || 0)
        }
      };
    } else if (type === 'incoming') {
      responseData = {
        incoming: results[0] || [],
        total: {
          incoming: results[0]?.length || 0
        }
      };
    } else if (type === 'outgoing') {
      responseData = {
        outgoing: results[0] || [],
        total: {
          outgoing: results[0]?.length || 0
        }
      };
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching swap requests:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch swap requests'
      }
    });
  }
};