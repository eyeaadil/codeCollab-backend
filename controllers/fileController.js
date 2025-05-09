import File from '../models/fileModel.js';
import Folder from '../models/folderModel.js';
import User from '../models/userModel.js'; // Importing the User model
import { parseToken } from '../utils/token-utils.js'; // Importing the parseToken function

// Create a new file
export const createFile = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const userId = parseToken(token); // Extract userId from the token

  const { name, folder } = req.body;

  try {
    const newFile = new File({ name, content, owner: userId, folder });
    await newFile.save();

    // Update the folder collection
    await Folder.findByIdAndUpdate(folder, { $push: { files: newFile._id } });

    // Update the user collection
    await User.findByIdAndUpdate(userId, { $push: { files: newFile._id } });
    await newFile.save();
    res.status(201).json({ message: 'File created successfully', file: newFile });
  } catch (error) {
    res.status(500).json({ message: 'Error creating file', error: error.message });
  }
};

// Get all files for the authorized user
export const getFiles = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const userId = parseToken(token); // Extract userId from the token

  try {
    const files = await File.find({ owner: userId });
    res.status(200).json({ message: 'Files retrieved successfully', files });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving files', error: error.message });
  }
};

// Get a file by ID
export const getFileById = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;

  try {
    const file = await File.findById(id);
    if (!file || file.owner.toString() !== userId) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }
    res.status(200).json({ message: 'File retrieved successfully', file });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving file', error: error.message });
  }
};

// Update a file
export const updateFile = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;
  const updates = req.body;

  try {
    const file = await File.findById(id);
    if (!file || file.owner.toString() !== userId) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    Object.assign(file, updates);
    await file.save();
    res.status(200).json({ message: 'File updated successfully', file });
  } catch (error) {
    res.status(500).json({ message: 'Error updating file', error: error.message });
  }
};

// Delete a file
export const deleteFile = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;

  try {
    const file = await File.findById(id);
    if (!file || file.owner.toString() !== userId) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    await file.remove();
    res.status(204).json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
};
