import jwt from 'jsonwebtoken';

import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique tokens

// Secret key used to sign tokens (replace with your secret key)
function generateUniqueToken() {
    return uuidv4(); // Generate a unique identifier
}
const jwtSecret = '123456';

// GenerateTokens creates access and refresh tokens
function generateTokens(user) {
    const accessToken = jwt.sign({ sub: user._id }, jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ sub: user._id }, jwtSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}

// SetAuthCookies sets secure cookies for access and refresh tokens
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('access_token', accessToken, { httpOnly: true, secure: true,sameSite:'strict',path:'/', maxAge: 86400 * 1000 }); // 1 day
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, maxAge: 604800 * 1000 }); // 7 days
}

// ParseToken validates a JWT and extracts the user ID
function parseToken(tokenString) {
    try {
        const decoded = jwt.verify(tokenString, jwtSecret);
        return decoded.sub; // Assuming the user ID is stored in the "sub" field
    } catch (err) {
        throw new Error('Invalid token');
    }
}

export {
    generateUniqueToken, // Export the new function
    generateTokens,
    setAuthCookies,
    parseToken
};
