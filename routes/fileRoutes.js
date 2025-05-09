import express from 'express';
import {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile
} from '../controllers/fileController.js'; // Import file controller functions

const router = express.Router();

// File Management Endpoints
router.post('/', createFile); // Create a new file
router.get('/', getFiles); // Get all files
router.get('/:id', getFileById); // Get a file by ID
router.put('/:id', updateFile); // Update a file
router.delete('/:id', deleteFile); // Delete a file

export default router;
