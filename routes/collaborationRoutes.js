import express from 'express';
import { 
  sendCollaborationRequest, 
  acceptCollaborationRequest,
  sendRoomInvite
} from '../controllers/collaborationController.js';

const router = express.Router();

// Route to send a collaboration request
router.post('/collaborate/send', sendCollaborationRequest);

// Route to accept a collaboration request
router.post('/collaborate/accept', acceptCollaborationRequest);

// Route to send room-specific collaboration invite
// router.post('/invite', sendRoomInvite);

export default router;
