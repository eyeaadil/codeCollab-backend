import express from 'express';
import { register, login, logout } from '../controllers/authController.js';
import {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile
} from '../controllers/fileController.js'; // Import file controller functions

const router = express.Router();

// User Registration
router.post('/register', register);

// User Login
router.post('/login', login);

// User Logout
router.post('/logout', logout);

// File Management Endpoints
router.post('/files', createFile); // Create a new file
router.get('/files', getFiles); // Get all files
router.get('/files/:id', getFileById); // Get a file by ID
router.put('/files/:id', updateFile); // Update a file
router.delete('/files/:id', deleteFile); // Delete a file

export default router;
