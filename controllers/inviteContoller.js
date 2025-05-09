import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Add debug logging
transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready');
  }
});

export const sendInvite = async (req, res) => {
  const { senderId, receiverEmail, roomId } = req.body;

  if (!receiverEmail || !roomId) {
    return res.status(400).json({ message: 'Email and room ID are required' });
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: receiverEmail,
      subject: 'Invitation to Collaborate on CodeCollab',
      html: `
        <h2>You've been invited to collaborate!</h2>
        <p>Someone has invited you to collaborate on a coding session.</p>
        <p>Click the link below to join:</p>
        <a href="${process.env.FRONTEND_URL}/room/${roomId}">Join Collaboration Room</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send invitation email' });
  }
};


