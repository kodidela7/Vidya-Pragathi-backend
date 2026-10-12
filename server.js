import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, getPool } from './db/database.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Public Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Karnataka South-East Graduates Career & Opportunity Desk API',
    version: '1.0.0',
    adminLogin: '/api/auth/login',
    jobsListing: '/api/jobs',
    eventsListing: '/api/events',
    documentation: '/api/health'
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'running',
    database: dbStatus
  });
});

// 1. Authentication & Authorization Routes
app.use('/api/auth', authRoutes);

// 2. Protected Administrative Routes (All protected by JWT authMiddleware)
app.use('/api/admin', adminRoutes);

// 3. Public Career Opportunities & Job Search API (with page 10 pagination)
app.use('/api/jobs', jobRoutes);

// 4. Public Mega Job Melas & Skill Bootcamps API
app.use('/api/events', eventRoutes);

// 3. Public Intake Endpoint: Graduate Registration
app.post('/api/graduates/register', async (req, res) => {
  try {
    const { fullName, mobile, email, district, taluk, education, stream, passoutYear, careerInterest } = req.body;

    if (!fullName || !mobile || !district || !education) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const pool = await getPool();
    const tokenId = `VP-2026-SE-${Math.floor(10000 + Math.random() * 90000)}`;

    await pool.query(
      `INSERT INTO graduates (token_id, full_name, mobile, email, district, taluk, education, stream, passout_year, career_interest)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tokenId, fullName, mobile, email || null, district, taluk || null, education, stream || null, passoutYear || null, careerInterest || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Graduate registration submitted successfully.',
      tokenId
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Database error saving registration.' });
  }
});

// 4. Public Intake Endpoint: Campaign Vote Pledge
app.post('/api/pledges', async (req, res) => {
  try {
    const { fullName, mobile, district, taluk, supportNote, volunteerOptIn } = req.body;

    if (!fullName || !mobile || !district) {
      return res.status(400).json({ success: false, message: 'Please provide full name, mobile, and district.' });
    }

    const pool = await getPool();
    await pool.query(
      `INSERT INTO vote_pledges (full_name, mobile, district, taluk, support_note, volunteer_opt_in)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, mobile, district, taluk || null, supportNote || null, volunteerOptIn ? 1 : 0]
    );

    return res.status(201).json({
      success: true,
      message: 'Vote pledge recorded successfully. Thank you for your support!'
    });
  } catch (error) {
    console.error('Pledge Error:', error);
    return res.status(500).json({ success: false, message: 'Database error saving pledge.' });
  }
});

// 5. Public Intake Endpoint: Helpdesk Query
app.post('/api/helpdesk/ticket', async (req, res) => {
  try {
    const { fullName, mobile, category, district, message } = req.body;

    if (!fullName || !mobile || !category || !district || !message) {
      return res.status(400).json({ success: false, message: 'Please fill in all helpdesk ticket fields.' });
    }

    const pool = await getPool();
    const ticketNumber = `GR-2026-NDA-${Math.floor(1000 + Math.random() * 9000)}`;

    await pool.query(
      `INSERT INTO helpdesk_tickets (ticket_number, full_name, mobile, category, district, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketNumber, fullName, mobile, category, district, message]
    );

    return res.status(201).json({
      success: true,
      message: 'Helpdesk ticket submitted successfully.',
      ticketNumber
    });
  } catch (error) {
    console.error('Helpdesk Error:', error);
    return res.status(500).json({ success: false, message: 'Database error creating helpdesk ticket.' });
  }
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
  
  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    console.log(`[Database] Connected successfully to MySQL database at ${process.env.DB_HOST} (${process.env.DB_NAME})`);
  } else {
    console.log(`[Database Notice] ${dbStatus.message || dbStatus.error}`);
  }
});
