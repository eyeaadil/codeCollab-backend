import User from '../models/userModel.js';
import { generateTokens, setAuthCookies } from '../utils/token-utils.js';

// User Registration
export const register = async (req, res) => {
  const { name, email, password, invitationToken } = req.body; // Added invitationToken

  // Validate input
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user instance
    const user = new User({ name, email, password });

    // Save the user instance
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    const response = {
      message: 'User registered successfully',
      user: {
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken
      }
    };

    // Check if invitationToken is present
    if (invitationToken) {
      response.redirectUrl = `${process.env.FRONTEND_URL}/collaborate/${invitationToken}`; // Redirect URL
    }

    // Check if invitationToken is present
    // if (invitationToken) {
    //   response.redirectUrl = `${process.env.FRONTEND_URL}/collaborate/${invitationToken}`; // Redirect URL
    // }

    // Check if invitationToken is present
    // if (invitationToken) {
    //   response.redirectUrl = `${process.env.FRONTEND_URL}/collaborate/${invitationToken}`; // Redirect URL
    // }

    // Check if invitationToken is present
    // if (invitationToken) {
    //   response.redirectUrl = `${process.env.FRONTEND_URL}/collaborate/${invitationToken}`; // Redirect URL
    // }


    // Check if invitationToken is present
    // if (invitationToken) {
    //   response.redirectUrl = `${process.env.FRONTEND_URL}/collaborate/${invitationToken}`; // Redirect URL
    // }

    res.status(201).json(response);
    // res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// User Login
export const login = async (req, res) => {
  
  console.log(req.body)  
  try {
    const { email, password } = req.body;
    console.log("FKJBDZKJFBDJKS")
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }


  
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);


    res.status(200).json({
      message: 'User logged in successfully',
      user: {
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User Logout
export const logout = (req, res) => {
  // Clear the cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  return res.status(200).json({ message: 'User logged out successfully' });
};
