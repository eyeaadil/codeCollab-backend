import express from 'express';
import  { sendInvite } from '../controllers/inviteContoller.js';

const router = express.Router();

router.post('/invite', sendInvite);

export default router;
