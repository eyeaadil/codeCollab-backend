import { parseToken } from '../utils/token-utils.js';
import User from '../models/userModel.js';

export const isAuthenticated = async(req, res, next) => {
  // Get token from Authorization header or cookies
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.cookies?.access_token;

  console.log("Auth header:", authHeader);
  console.log("Extracted Token:", token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const userId = parseToken(token);
    console.log("UserId from token:", userId);
    
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
