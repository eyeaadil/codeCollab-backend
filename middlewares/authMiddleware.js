import { parseToken } from '../utils/token-utils.js';
import User from '../models/userModel.js';

export const isAuthenticated = async(req, res, next) => {
  // Get token from cookies
  const token = req.cookies?.access_token;
  console.log("Cookies:", req);
  console.log("Access token from cookie:", token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const userId = parseToken(token);
    console.log("UserId:", userId);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    req.user = user; // Attach user to request
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
