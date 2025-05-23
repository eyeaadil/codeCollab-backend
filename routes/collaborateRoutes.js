// routes/collaborateRoutes.js
import express from 'express';
import { protect } from '../controllers/authController.js';
import { createRoom, inviteToRoom, joinRoom } from '../controllers/roomController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create-room', isAuthenticated, createRoom);
router.post('/invite', isAuthenticated, inviteToRoom);
router.post('/join', isAuthenticated, joinRoom);

export default router;