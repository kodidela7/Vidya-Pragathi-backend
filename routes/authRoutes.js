import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getPool } from '../db/database.js';
import { verifyAdminToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'karnataka_vidyapragathi_mlc2026_jwt_secret_secure_key_#98214';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @route   POST /api/auth/login
 * @desc    Admin login and JWT token generation
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const pool = await getPool();

    // Look up admin by username or email
    const [rows] = await pool.query(
      `SELECT id, username, email, password_hash, full_name, role, status 
       FROM admins 
       WHERE username = ? OR email = ? 
       LIMIT 1`,
      [username.trim(), username.trim().toLowerCase()]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.'
      });
    }

    const admin = rows[0];

    // Check account status
    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Admin account is currently inactive. Contact system superadmin.'
      });
    }

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.'
      });
    }

    // Update last_login
    await pool.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    // Sign JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Verify token and get current admin profile
 * @access  Protected (Admin JWT)
 */
router.get('/me', verifyAdminToken, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, username, email, full_name, role, status, last_login, created_at FROM admins WHERE id = ? LIMIT 1',
      [req.admin.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found.'
      });
    }

    return res.json({
      success: true,
      admin: rows[0]
    });
  } catch (error) {
    console.error('Auth Verify Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin profile.'
    });
  }
});

export default router;
