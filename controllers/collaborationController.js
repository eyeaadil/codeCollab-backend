import User from '../models/userModel.js';
import nodemailer from 'nodemailer';
import { generateUniqueToken } from '../utils/token-utils.js'; 
// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Ensure this utility function exists

// Send collaboration request
export const sendCollaborationRequest = async (req, res) => {
  const { senderId, receiverEmail, roomId } = req.body;
    const inviteToken = generateUniqueToken(); // Generate a unique token
    // const inviteToken = generateInviteToken(); // Remove this duplicate declaration

    const inviteLink = `${process.env.FRONTEND_URL}/signup?token=${inviteToken}`; // Ensure this link uses the correct inviteToken


  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Send email invitation with the unique invite link

    const inviteToken = generateInviteToken(); // Function to generate a unique token
    const inviteLink = `${process.env.FRONTEND_URL}/join/${roomId}?token=${inviteToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: receiverEmail,
      subject: 'Collaboration Invitation',
      html: `
        <p>You've been invited to collaborate on a code editor session by ${sender.name}.</p>
        <p>Click <a href="${inviteLink}">here</a> to join the session.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    // Save the invitation token to the database or handle it as needed
    await saveInvitationToken(senderId, receiverEmail, inviteToken); // Function to save the token

    res.status(200).json({
      message: 'Collaboration request sent',
      roomId,
      inviteLink
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending collaboration request', error });
  }
};

// Accept collaboration request
// Send room-specific collaboration invite
export const sendRoomInvite = async (req, res) => {
  const { senderId, receiverEmail, roomId } = req.body;

  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    // Send email invitation
    const inviteLink = `${process.env.FRONTEND_URL}/join/${roomId}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: receiverEmail,
      subject: 'Room Collaboration Invitation',
      html: `
        <p>You've been invited to collaborate on a code editor session by ${sender.name}.</p>
        <p>Click <a href="${inviteLink}">here</a> to join the session.</p>
        <p>Room ID: ${roomId}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'Room collaboration invite sent',
      roomId,
      inviteLink
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error sending room collaboration invite', 
      error 
    });
  }
};

export const acceptCollaborationRequest = async (req, res) => {
  const { userId, collaboratorId, roomId, invitationToken } = req.body; // Accept invitationToken

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add collaborator to user's collaborators
    user.collaborators.push(collaboratorId);
    await user.save();

    // Redirect to the appropriate page after successful signup
    res.redirect(`${process.env.FRONTEND_URL}/collaborate/${invitationToken}`);
    res.status(200).json({
      message: 'Collaboration request accepted',
      roomId,
      collaboratorId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting collaboration request', error });
  }
};
