import express from 'express';
import { runCode } from '../controllers/codeExecutionController.js';
import {isAuthenticated  } from '../middlewares/authMiddleware.js';

const router = express.Router();
console.log("codeExecutionRoutes");

router.post('/run-code', isAuthenticated , runCode);

export default router; 