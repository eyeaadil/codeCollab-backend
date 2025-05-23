// controllers/roomController.js
import { v4 as uuidv4 } from 'uuid';
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';
import { sendInviteEmail } from '../utils/email-utils.js';

// Create a new room
export const createRoom = async (req, res) => {
  const { fileName } = req.body;
  const user = req.user; // From protect middleware

  if (!fileName) {
    return res.status(400).json({ message: 'File name is required' });
  }

  try {
    const roomId = uuidv4();
    const room = new Room({
      roomId,
      creator: user._id,
      fileName,
      invitedUsers: []
    });
    await room.save();

    res.status(201).json({ message: 'Room created successfully', roomId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Invite user to a room
export const inviteToRoom = async (req, res) => {
  const { receiverEmail, roomId } = req.body;
  const sender = req.user;

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (room.creator.toString() !== sender._id.toString()) {
      return res.status(403).json({ message: 'Only the room creator can invite users' });
    }

    const receiver = await User.findOne({ email: receiverEmail });
    const inviteLink = `${process.env.FRONTEND_URL}/join-room?roomId=${roomId}`;

    if (!receiver) {
      // Send invite with signup link including roomId
      await sendInviteEmail({
        to: receiverEmail,
        senderName: sender.name,
        inviteLink,
      });
    } else {
      // Add user to invitedUsers
      if (!room.invitedUsers.includes(receiver._id)) {
        room.invitedUsers.push(receiver._id);
        await room.save();
      }
      await sendInviteEmail({
        to: receiverEmail,
        senderName: sender.name,
        inviteLink,
      });
    }

    res.status(200).json({ message: `Invite sent to ${receiverEmail}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate room ID and join session
export const joinRoom = async (req, res) => {
  const { roomId } = req.body;
  const user = req.user;

  try {
    const room = await Room.findOne({ roomId }).populate('creator invitedUsers');
    if (!room) {
      return res.status(404).json({ message: 'Room not found or expired' });
    }
    if (room.creator._id.toString() !== user._id.toString() && !room.invitedUsers.some(u => u._id.toString() === user._id.toString())) {
      return res.status(403).json({ message: 'Unauthorized: Not invited to this room' });
    }

    res.status(200).json({
      message: 'Room access granted',
      roomId,
      name: room.name,
      content: room.content, // Return code content for the editor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get room details for the editor dashboard (protected route)
export const getRoomDetails = async (req, res) => {
  const { roomId } = req.params;
  const user = req.user;

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found or expired' });
    }
    if (room.creator.toString() !== user._id.toString() && !room.invitedUsers.some(u => u._id.toString() === user._id.toString())) {
      return res.status(403).json({ message: 'Unauthorized: Not invited to this room' });
    }

    res.status(200).json({
      roomId,
      name: room.name,
      content: room.content, // Return code content for the editor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};