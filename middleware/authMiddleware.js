import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'karnataka_vidyapragathi_mlc2026_jwt_secret_secure_key_#98214';

/**
 * Middleware to verify Admin JWT Token
 * Protects every upcoming administrative route
 */
export function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach decoded admin payload to request
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Invalid or forged token.'
    });
  }
}
