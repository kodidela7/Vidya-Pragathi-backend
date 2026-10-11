import express from 'express';
import { getPool } from '../db/database.js';

const router = express.Router();

/**
 * @route   GET /api/events
 * @desc    Get published upcoming/ongoing events (Job Melas, Bootcamps, Drives)
 * @access  Public
 * @query   district, type, search
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { district, type, search } = req.query;

    let sql = `
      SELECT 
        e.*, 
        COUNT(r.id) AS registrations_count
      FROM events e
      LEFT JOIN event_registrations r ON e.id = r.event_id
      WHERE e.status IN ('Upcoming', 'Ongoing')
    `;
    const params = [];

    if (district && district !== 'all' && district.trim() !== '') {
      sql += ' AND e.district = ?';
      params.push(district.trim());
    }

    if (type && type !== 'all' && type.trim() !== '') {
      sql += ' AND e.event_type = ?';
      params.push(type.trim());
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ' AND (e.title LIKE ? OR e.venue LIKE ? OR e.eligibility LIKE ? OR e.description LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY e.id ORDER BY e.is_featured DESC, e.event_date ASC';

    const [rows] = await pool.query(sql, params);

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Get Events Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load events.' });
  }
});

/**
 * @route   GET /api/events/:id
 * @desc    Get single event profile
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT e.*, COUNT(r.id) AS registrations_count
       FROM events e
       LEFT JOIN event_registrations r ON e.id = r.event_id
       WHERE e.id = ?
       GROUP BY e.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Get Single Event Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load event details.' });
  }
});

/**
 * @route   POST /api/events/:id/register
 * @desc    Register a graduate for an event and issue a free digital entry pass token
 * @access  Public
 */
router.post('/:id/register', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const {
      fullName,
      mobile,
      email,
      education,
      stream,
      passoutYear,
      district,
      employmentStatus
    } = req.body;

    // 1. Validation
    if (!fullName || !mobile || !education || !passoutYear || !district) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields (Name, Mobile, Degree, Passout Year, District).'
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.'
      });
    }

    // 2. Verify event exists
    const [[event]] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.status === 'Cancelled' || event.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Registration is closed for this event (${event.status}).`
      });
    }

    // 3. Check for existing registration with same mobile number for this event
    const [existing] = await pool.query(
      'SELECT * FROM event_registrations WHERE event_id = ? AND mobile = ? LIMIT 1',
      [id, cleanMobile]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        isExisting: true,
        message: 'You are already registered for this event! Here is your digital entry pass.',
        passToken: existing[0].pass_token,
        registration: existing[0],
        event: {
          id: event.id,
          title: event.title,
          venue: event.venue,
          event_date: event.event_date,
          start_time: event.start_time,
          district: event.district
        }
      });
    }

    // 4. Generate unique pass token: e.g. #MELA-2026-TUM-4821 or #PASS-2026-KLR-3910
    const districtCode = (district || 'KA').substring(0, 3).toUpperCase();
    const typeCode = event.event_type === 'Skill Bootcamp' ? 'CAMP' : 'MELA';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const passToken = `${typeCode}-2026-${districtCode}-${randomSuffix}`;

    // 5. Insert registration
    const [result] = await pool.query(
      `INSERT INTO event_registrations (
        pass_token, event_id, full_name, mobile, email, education, stream,
        passout_year, district, employment_status, attendance_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registered')`,
      [
        passToken,
        id,
        fullName.trim(),
        cleanMobile,
        email ? email.trim() : null,
        education.trim(),
        stream ? stream.trim() : 'General',
        passoutYear.trim(),
        district.trim(),
        employmentStatus || 'Fresher / Seeking Job'
      ]
    );

    // Also check if candidate exists in `graduates` table; if not, store into general constituency roster too
    try {
      const [gradExists] = await pool.query('SELECT id FROM graduates WHERE mobile = ? LIMIT 1', [cleanMobile]);
      if (gradExists.length === 0) {
        const tokenId = `KA-SE-${Math.floor(1000 + Math.random() * 9000)}`;
        await pool.query(
          `INSERT INTO graduates (token_id, full_name, mobile, email, district, education, stream, passout_year, career_interest)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tokenId,
            fullName.trim(),
            cleanMobile,
            email ? email.trim() : null,
            district.trim(),
            education.trim(),
            stream ? stream.trim() : 'General',
            passoutYear.trim(),
            `Attended: ${event.title}`
          ]
        );
      }
    } catch (gradErr) {
      console.warn('Note: Could not mirror to general graduates roster:', gradErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Free Entry E-Pass confirmed successfully!',
      passToken,
      registrationId: result.insertId,
      registration: {
        id: result.insertId,
        pass_token: passToken,
        full_name: fullName.trim(),
        mobile: cleanMobile,
        education: education.trim(),
        passout_year: passoutYear.trim(),
        district: district.trim()
      },
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        event_date: event.event_date,
        start_time: event.start_time,
        district: event.district
      }
    });
  } catch (error) {
    console.error('Event Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Database error registering for event.' });
  }
});

export default router;
