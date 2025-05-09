import { parseToken } from '../utils/token-utils.js';

export const isAuthenticated = (req, res, next) => {
  const token = req.cookies ? req.cookies.access_token : null; // Corrected to req.cookies
  // console.log("token:", token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const userId = parseToken(token); // Validate the token and extract user ID
    req.userId = userId; // Attach user ID to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
