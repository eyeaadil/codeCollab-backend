// controllers/roomController.js
import { v4 as uuidv4 } from 'uuid';
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';
import { sendInviteEmail } from '../utils/email-utils.js';

// Create a new room
export const createRoom = async (req, res) => {
  const { roomId, name } = req.body; // Expect roomId and name from frontend
  console.log(roomId, name)
  const user = req.user; // From protect middleware
  console.log(user)
  if (!roomId || !name) {
    return res.status(400).json({ message: 'Room ID and name are required' });
  }

  try {
    // Check if a room with the given roomId already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(409).json({ message: 'Room ID already exists. Please choose a different one.' });
    }

    const room = new Room({
      roomId,
      creator: user._id,
      name, // Use the provided name for the room
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
  console.log(receiverEmail, roomId)
  const sender = req.user;

  try {
    const room = await Room.findOne({ roomId });
    console.log("room", room)
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (room.creator.toString() !== sender._id.toString()) {
      return res.status(403).json({ message: 'Only the room creator can invite users' });
    }

    const receiver = await User.findOne({ email: receiverEmail });
    console.log("receiver", receiver)
    const inviteLink = `${process.env.FRONTEND_URL}/join-room?roomId=${roomId}`;
    console.log("inviteLink", inviteLink)
    if (!receiver) {
      // Send invite with signup link including roomId
      console.log("sending invite")
      await sendInviteEmail({
        to: receiverEmail,
        senderName: sender.name,
        inviteLink,
      });
      console.log("invite sent")
    } else {
      // Add user to invitedUsers
      console.log("room.invitedUsers", room.invitedUsers)
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