// controllers/authController.js
import User from '../models/userModel.js';
import Room from '../models/roomModel.js'; // Import Room model
import { generateTokens, setAuthCookies } from '../utils/token-utils.js';

// Middleware to verify JWT
export const protect = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  try {
    const userId = parseToken(token);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    req.user = user; // Attach user to request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// User Registration
export const register = async (req, res) => {
  const { name, email, password, roomId } = req.body; // Changed from invitationToken to roomId

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    const response = {
      message: 'User registered successfully',
      user: { name: user.name, email: user.email, accessToken, refreshToken },
    };

    if (roomId) {
      const room = await Room.findOne({ roomId });
      if (room) {
        response.redirectUrl = `${process.env.FRONTEND_URL}/join-room?roomId=${roomId}`;
      }
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// User Login
export const login = async (req, res) => {
  try {
    const { email, password, roomId } = req.body; // Added roomId
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    console.log("tooooooooikeenenen",req.cookies)
    const response = {
      message: 'User logged in successfully',
      user: { name: user.name, email: user.email, accessToken, refreshToken },
    };

    if (roomId) {
      const room = await Room.findOne({ roomId });
      if (room) {
        response.redirectUrl = `${process.env.FRONTEND_URL}/join-room?roomId=${roomId}`;
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User Logout (unchanged)
export const logout = (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.status(200).json({ message: 'User logged out successfully' });
};