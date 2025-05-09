import Folder from '../models/folderModel.js';
import User from '../models/userModel.js';
import { parseToken } from '../utils/token-utils.js'; // Importing the parseToken function
// Create a new folder
export const createFolder = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  const userId = parseToken(token); // Extract userId from the token

  const { name, parentFolder } = req.body;

  try {
    const newFolder = new Folder({ name, owner: userId, parentFolder });
    await newFolder.save();

    // Update the user collection to include the new folder ID
    await User.findByIdAndUpdate(userId, { $push: { folders: newFolder._id } });

    res.status(201).json({ message: 'Folder created successfully', folder: newFolder });
  } catch (error) {
    res.status(500).json({ message: 'Error creating folder', error: error.message });
  }
};


// Get all folders for the authorized user
export const getFolders = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  const userId = parseToken(token); // Extract userId from the token

  try {
    const folders = await Folder.find({ owner: userId });
    res.status(200).json(folders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving folders', error: error.message });
  }
};

// Get a folder by ID
export const getFolderById = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;

  try {
    const folder = await Folder.findById(id);
    if (!folder || folder.owner.toString() !== userId) {
      return res.status(404).json({ message: 'Folder not found or unauthorized' });
    }
    res.status(200).json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving folder', error: error.message });
  }
};

// Update a folder
export const updateFolder = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;
  const updates = req.body;

  try {
    const folder = await Folder.findById(id);
    if (!folder || folder.owner.toString() !== userId) {
      return res.status(404).json({ message: 'Folder not found or unauthorized' });
    }

    Object.assign(folder, updates);
    await folder.save();
    res.status(200).json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating folder', error: error.message });
  }
};

// Delete a folder
export const deleteFolder = async (req, res) => {
  const token = req.cookies.access_token; // Get the token from cookies
  const userId = parseToken(token); // Extract userId from the token

  const { id } = req.params;

  try {
    const folder = await Folder.findById(id);
    if (!folder || folder.owner.toString() !== userId) {
      return res.status(404).json({ message: 'Folder not found or unauthorized' });
    }

    await folder.remove();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting folder', error: error.message });
  }
};
