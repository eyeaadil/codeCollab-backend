// utils/email-utils.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log("ttttttttttttttttttttttttttt",process.env.EMAIL_USER,process.env.EMAIL_PASSWORD)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP server connection error:", error);
  } else {
    console.log("SMTP server is ready to take our messages");
  }
});

console.log("Nodemailer User:", process.env.EMAIL_USER);
console.log("Nodemailer Pass (first 3 chars):", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.substring(0, 3) + '...' : 'not set');

export const sendInviteEmail = async ({ to, senderName, inviteLink }) => {
  console.log("Sending invite email to:", to);
  console.log("Nodemailer User:", process.env.EMAIL_USER);
console.log("Nodemailer Pass (first 3 chars):", process.env.EMAIL_PASSWORD )

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Join ${senderName}'s Coding Session`,
    html: `
      <p>Hi,</p>
      <p>${senderName} has invited you to a collaborative coding session.</p>
      <p><a href="${inviteLink}">Click here to join</a></p>
      <p>Or copy this link: ${inviteLink}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log("Email sent successfully");
};