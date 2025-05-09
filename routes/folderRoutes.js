import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js'; // Importing the isAuthenticated middleware
import {
    createFolder,
    getFolders,
    getFolderById,
    updateFolder,
    deleteFolder
} from '../controllers/folderController.js'; // Importing folder controller functions

const router = express.Router();

// Folder Routes
router.post('/folders', isAuthenticated, createFolder); // Create a new folder
router.get('/folders', isAuthenticated, getFolders); // Get all folders
router.get('/folders/:id', isAuthenticated, getFolderById); // Get folder by ID
router.put('/folders/:id', isAuthenticated, updateFolder); // Update a folder
router.delete('/folders/:id', isAuthenticated, deleteFolder); // Delete a folder

export default router;
