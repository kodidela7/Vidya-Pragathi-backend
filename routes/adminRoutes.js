import express from 'express';
import { getPool } from '../db/database.js';
import { verifyAdminToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply verifyAdminToken middleware to protect every single route in this router
router.use(verifyAdminToken);

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard summary statistics
 * @access  Protected (Admin JWT)
 */
router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();

    const [[graduatesCount]] = await pool.query('SELECT COUNT(*) AS total FROM graduates');
    const [[pledgesCount]] = await pool.query('SELECT COUNT(*) AS total FROM vote_pledges');
    const [[ticketsCount]] = await pool.query('SELECT COUNT(*) AS total FROM helpdesk_tickets');
    const [[openTicketsCount]] = await pool.query('SELECT COUNT(*) AS total FROM helpdesk_tickets WHERE status = "Open"');
    const [[eventsCount]] = await pool.query('SELECT COUNT(*) AS total FROM events');
    const [[eventRegistrationsCount]] = await pool.query('SELECT COUNT(*) AS total FROM event_registrations');

    // Recent activity
    const [recentGraduates] = await pool.query('SELECT token_id, full_name, district, education, created_at FROM graduates ORDER BY created_at DESC LIMIT 5');
    const [recentPledges] = await pool.query('SELECT full_name, district, volunteer_opt_in, created_at FROM vote_pledges ORDER BY created_at DESC LIMIT 5');

    return res.json({
      success: true,
      stats: {
        totalGraduates: graduatesCount.total || 0,
        totalPledges: pledgesCount.total || 0,
        totalTickets: ticketsCount.total || 0,
        openTickets: openTicketsCount.total || 0,
        totalEvents: eventsCount ? eventsCount.total : 0,
        totalEventRegistrations: eventRegistrationsCount ? eventRegistrationsCount.total : 0
      },
      recentActivity: {
        graduates: recentGraduates,
        pledges: recentPledges
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin statistics.' });
  }
});

/**
 * @route   GET /api/admin/graduates
 * @desc    Get list of registered graduates with pagination (10 per page) and query parameters
 * @access  Protected (Admin JWT)
 * @query   page (default 1), limit (default 10), search, district, education
 */
router.get('/graduates', async (req, res) => {
  try {
    const pool = await getPool();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { district, search, education } = req.query;

    let baseFilter = ' WHERE 1=1';
    const params = [];

    if (district && district !== 'all' && district.trim() !== '') {
      baseFilter += ' AND district = ?';
      params.push(district.trim());
    }

    if (education && education !== 'all' && education.trim() !== '') {
      baseFilter += ' AND education = ?';
      params.push(education.trim());
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      baseFilter += ' AND (full_name LIKE ? OR mobile LIKE ? OR token_id LIKE ? OR email LIKE ? OR career_interest LIKE ?)';
      params.push(term, term, term, term, term);
    }

    // 1. Total count query
    const countSql = `SELECT COUNT(*) AS total FROM graduates ${baseFilter}`;
    const [[countResult]] = await pool.query(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Paginated rows query
    const dataSql = `SELECT * FROM graduates ${baseFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(dataSql, queryParams);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('Admin Graduates Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load graduates.' });
  }
});

/**
 * @route   DELETE /api/admin/graduates/:id
 * @desc    Delete a graduate registration record
 * @access  Protected (Admin JWT)
 */
router.delete('/graduates/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM graduates WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    return res.json({ success: true, message: 'Registration deleted successfully.' });
  } catch (error) {
    console.error('Delete Graduate Error:', error);
    return res.status(500).json({ success: false, message: 'Database error deleting registration.' });
  }
});

/**
 * @route   GET /api/admin/pledges
 * @desc    Get list of campaign vote pledges
 * @access  Protected (Admin JWT)
 */
router.get('/pledges', async (req, res) => {
  try {
    const pool = await getPool();
    const { district } = req.query;

    let query = 'SELECT * FROM vote_pledges WHERE 1=1';
    const params = [];

    if (district) {
      query += ' AND district = ?';
      params.push(district);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Admin Pledges Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load vote pledges.' });
  }
});

/**
 * @route   GET /api/admin/helpdesk (and /api/admin/tickets)
 * @desc    Get paginated, filtered list of helpdesk tickets (10 per page default)
 * @access  Protected (Admin JWT)
 * @query   page, limit, search, district, status, category
 */
const getHelpdeskTicketsHandler = async (req, res) => {
  try {
    const pool = await getPool();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { district, search, status, category } = req.query;

    let baseFilter = ' WHERE 1=1';
    const params = [];

    if (district && district !== 'all' && district.trim() !== '') {
      baseFilter += ' AND district = ?';
      params.push(district.trim());
    }

    if (status && status !== 'all' && status.trim() !== '') {
      baseFilter += ' AND status = ?';
      params.push(status.trim());
    }

    if (category && category !== 'all' && category.trim() !== '') {
      baseFilter += ' AND category = ?';
      params.push(category.trim());
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      baseFilter += ' AND (ticket_number LIKE ? OR full_name LIKE ? OR mobile LIKE ? OR message LIKE ?)';
      params.push(term, term, term, term);
    }

    // 1. Total count query
    const countSql = `SELECT COUNT(*) AS total FROM helpdesk_tickets ${baseFilter}`;
    const [[countResult]] = await pool.query(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Paginated rows query
    const dataSql = `SELECT * FROM helpdesk_tickets ${baseFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(dataSql, queryParams);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('Admin Tickets Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load helpdesk tickets.' });
  }
};

router.get('/helpdesk', getHelpdeskTicketsHandler);
router.get('/tickets', getHelpdeskTicketsHandler);

/**
 * @route   PUT /api/admin/helpdesk/:id
 * @desc    Update ticket status (Open, In Review, Resolved, Closed)
 * @access  Protected (Admin JWT)
 */
router.put('/helpdesk/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const [result] = await pool.query(
      'UPDATE helpdesk_tickets SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    return res.json({ success: true, message: `Ticket status updated to "${status}".` });
  } catch (error) {
    console.error('Update Ticket Error:', error);
    return res.status(500).json({ success: false, message: 'Database error updating ticket.' });
  }
});

/**
 * @route   DELETE /api/admin/helpdesk/:id
 * @desc    Delete a helpdesk ticket record
 * @access  Protected (Admin JWT)
 */
router.delete('/helpdesk/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM helpdesk_tickets WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    return res.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (error) {
    console.error('Delete Ticket Error:', error);
    return res.status(500).json({ success: false, message: 'Database error deleting ticket.' });
  }
});

/**
 * @route   GET /api/admin/jobs
 * @desc    Get all jobs for admin management
 * @access  Protected (Admin JWT)
 */
router.get('/jobs', async (req, res) => {
  try {
    const pool = await getPool();
    const { search, district, status, category } = req.query;

    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      query += ' AND (title LIKE ? OR company LIKE ? OR skills LIKE ? OR qualification LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (district && district !== 'all') {
      query += ' AND district = ?';
      params.push(district);
    }

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Admin Jobs List Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load jobs list.' });
  }
});

/**
 * @route   POST /api/admin/jobs
 * @desc    Create a new job opportunity
 * @access  Protected (Admin JWT)
 */
router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      company,
      category,
      job_type = 'Full Time',
      district,
      taluk,
      qualification,
      experience = 'Freshers',
      passing_year,
      salary,
      openings,
      deadline,
      apply_url,
      description,
      skills,
      status = 'active',
      source_note
    } = req.body;

    if (!title || !company || !category || !district || !qualification || !deadline || !apply_url || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields (title, company, category, district, qualification, deadline, apply_url, description).'
      });
    }

    const pool = await getPool();

    const [result] = await pool.query(
      `INSERT INTO jobs (title, company, category, job_type, district, taluk, qualification, experience, passing_year, salary, openings, deadline, apply_url, description, skills, status, source_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        company.trim(),
        category.trim(),
        job_type.trim(),
        district.trim(),
        taluk ? taluk.trim() : null,
        qualification.trim(),
        experience ? experience.trim() : 'Freshers',
        passing_year ? passing_year.trim() : null,
        salary ? salary.trim() : null,
        openings ? openings.trim() : null,
        deadline,
        apply_url.trim(),
        description.trim(),
        skills ? skills.trim() : null,
        status || 'active',
        source_note ? source_note.trim() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Job opportunity created successfully.',
      jobId: result.insertId
    });
  } catch (error) {
    console.error('Create Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create job opportunity.',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/jobs/:id
 * @desc    Update existing job details or toggle status
 * @access  Protected (Admin JWT)
 */
router.put('/jobs/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const {
      title,
      company,
      category,
      job_type,
      district,
      taluk,
      qualification,
      experience,
      passing_year,
      salary,
      openings,
      deadline,
      apply_url,
      description,
      skills,
      status,
      source_note
    } = req.body;

    const pool = await getPool();

    await pool.query(
      `UPDATE jobs SET
        title = COALESCE(?, title),
        company = COALESCE(?, company),
        category = COALESCE(?, category),
        job_type = COALESCE(?, job_type),
        district = COALESCE(?, district),
        taluk = COALESCE(?, taluk),
        qualification = COALESCE(?, qualification),
        experience = COALESCE(?, experience),
        passing_year = COALESCE(?, passing_year),
        salary = COALESCE(?, salary),
        openings = COALESCE(?, openings),
        deadline = COALESCE(?, deadline),
        apply_url = COALESCE(?, apply_url),
        description = COALESCE(?, description),
        skills = COALESCE(?, skills),
        status = COALESCE(?, status),
        source_note = COALESCE(?, source_note)
       WHERE id = ?`,
      [
        title, company, category, job_type, district, taluk,
        qualification, experience, passing_year, salary, openings,
        deadline, apply_url, description, skills, status, source_note,
        jobId
      ]
    );

    return res.json({
      success: true,
      message: 'Opportunity updated successfully.'
    });
  } catch (error) {
    console.error('Update Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update opportunity.'
    });
  }
});

/**
 * @route   DELETE /api/admin/jobs/:id
 * @desc    Delete job opportunity
 * @access  Protected (Admin JWT)
 */
router.delete('/jobs/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const pool = await getPool();

    await pool.query('DELETE FROM jobs WHERE id = ?', [jobId]);

    return res.json({
      success: true,
      message: 'Opportunity deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Job Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete opportunity.'
    });
  }
});

/* ===================================================================
   6. EVENT MANAGEMENT (JOB MELAS & SKILL BOOTCAMPS)
   =================================================================== */

/**
 * @route   GET /api/admin/events
 * @desc    Get paginated events with live registration count
 * @access  Protected (Admin JWT)
 */
router.get('/events', async (req, res) => {
  try {
    const pool = await getPool();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { district, status, type, search } = req.query;

    let baseFilter = ' WHERE 1=1';
    const params = [];

    if (district && district !== 'all' && district.trim() !== '') {
      baseFilter += ' AND e.district = ?';
      params.push(district.trim());
    }

    if (status && status !== 'all' && status.trim() !== '') {
      baseFilter += ' AND e.status = ?';
      params.push(status.trim());
    }

    if (type && type !== 'all' && type.trim() !== '') {
      baseFilter += ' AND e.event_type = ?';
      params.push(type.trim());
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      baseFilter += ' AND (e.title LIKE ? OR e.venue LIKE ? OR e.event_code LIKE ?)';
      params.push(term, term, term);
    }

    // 1. Total count
    const countSql = `SELECT COUNT(*) AS total FROM events e ${baseFilter}`;
    const [[countResult]] = await pool.query(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Data with registrations count
    const dataSql = `
      SELECT 
        e.*, 
        COUNT(r.id) AS registrations_count
      FROM events e
      LEFT JOIN event_registrations r ON e.id = r.event_id
      ${baseFilter}
      GROUP BY e.id
      ORDER BY e.event_date DESC, e.id DESC
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(dataSql, queryParams);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('Admin Events Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load events.' });
  }
});

/**
 * @route   POST /api/admin/events
 * @desc    Create new Job Mela or Skill Bootcamp
 * @access  Protected (Admin JWT)
 */
router.post('/events', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      title,
      title_kn,
      event_type,
      district,
      venue,
      venue_kn,
      event_date,
      start_time,
      end_time,
      companies_count,
      expected_openings,
      eligibility,
      eligibility_kn,
      batches_eligible,
      description,
      description_kn,
      entry_badge,
      banner_image,
      is_featured,
      status
    } = req.body;

    if (!title || !district || !venue || !event_date || !eligibility) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Title, District, Venue, Event Date, and Eligibility.'
      });
    }

    const districtCode = (district || 'KA').substring(0, 3).toUpperCase();
    const typeCode = event_type === 'Skill Bootcamp' ? 'CAMP' : 'MELA';
    const event_code = `${typeCode}-2026-${districtCode}-${Math.floor(100 + Math.random() * 900)}`;

    const featuredVal = (is_featured === true || is_featured === 1 || is_featured === '1' || is_featured === 'true') ? 1 : 0;

    // What if admin selected for 2 featured events?
    // Exclusively set only 1 featured event: if this event is featured, unset all others
    if (featuredVal === 1) {
      await pool.query('UPDATE events SET is_featured = 0');
    }

    const cleanTitle = title ? String(title).trim() : '';
    const cleanTitleKn = title_kn ? String(title_kn).trim() : null;
    const cleanDistrict = district ? String(district).trim() : 'Karnataka';
    const cleanVenue = venue ? String(venue).trim() : '';
    const cleanVenueKn = venue_kn ? String(venue_kn).trim() : null;
    const cleanExpectedOpenings = (expected_openings !== undefined && expected_openings !== null && expected_openings !== '')
      ? String(expected_openings).trim()
      : null;
    const cleanCompaniesCount = parseInt(companies_count, 10) || 0;
    const cleanEligibility = eligibility ? String(eligibility).trim() : 'All Degree Graduates';
    const cleanEligibilityKn = eligibility_kn ? String(eligibility_kn).trim() : null;
    const cleanBatchesEligible = batches_eligible ? String(batches_eligible).trim() : null;
    const cleanDescription = description ? String(description).trim() : 'Constituency career empowerment event.';
    const cleanDescriptionKn = description_kn ? String(description_kn).trim() : null;

    const [result] = await pool.query(
      `INSERT INTO events (
        event_code, title, title_kn, event_type, district, venue, venue_kn,
        event_date, start_time, end_time, companies_count, expected_openings,
        eligibility, eligibility_kn, batches_eligible, description, description_kn,
        entry_badge, banner_image, is_featured, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_code,
        cleanTitle,
        cleanTitleKn,
        event_type || 'Mega Job Mela',
        cleanDistrict,
        cleanVenue,
        cleanVenueKn,
        event_date,
        start_time || '9:30 AM',
        end_time || '5:00 PM',
        cleanCompaniesCount,
        cleanExpectedOpenings,
        cleanEligibility,
        cleanEligibilityKn,
        cleanBatchesEligible,
        cleanDescription,
        cleanDescriptionKn,
        entry_badge || '100% Free E-Pass',
        banner_image || '/images/candidate-graduates-meet.jpeg',
        featuredVal,
        status || 'Upcoming'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      eventId: result.insertId,
      eventCode: event_code
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({ success: false, message: 'Database error creating event: ' + (error.sqlMessage || error.message) });
  }
});

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update existing event
 * @access  Protected (Admin JWT)
 */
router.put('/events/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const {
      title,
      title_kn,
      event_type,
      district,
      venue,
      venue_kn,
      event_date,
      start_time,
      end_time,
      companies_count,
      expected_openings,
      eligibility,
      eligibility_kn,
      batches_eligible,
      description,
      description_kn,
      entry_badge,
      banner_image,
      is_featured,
      status
    } = req.body;

    const featuredVal = is_featured !== undefined
      ? ((is_featured === true || is_featured === 1 || is_featured === '1' || is_featured === 'true') ? 1 : 0)
      : null;

    // If setting this event as featured, unset all other events so only 1 remains featured
    if (featuredVal === 1) {
      await pool.query('UPDATE events SET is_featured = 0 WHERE id != ?', [id]);
    }

    const cleanExpectedOpenings = (expected_openings !== undefined && expected_openings !== null && expected_openings !== '')
      ? String(expected_openings).trim()
      : null;
    const cleanCompaniesCount = companies_count !== undefined
      ? (parseInt(companies_count, 10) || 0)
      : null;

    const [result] = await pool.query(
      `UPDATE events SET
        title = COALESCE(?, title),
        title_kn = COALESCE(?, title_kn),
        event_type = COALESCE(?, event_type),
        district = COALESCE(?, district),
        venue = COALESCE(?, venue),
        venue_kn = COALESCE(?, venue_kn),
        event_date = COALESCE(?, event_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        companies_count = COALESCE(?, companies_count),
        expected_openings = COALESCE(?, expected_openings),
        eligibility = COALESCE(?, eligibility),
        eligibility_kn = COALESCE(?, eligibility_kn),
        batches_eligible = COALESCE(?, batches_eligible),
        description = COALESCE(?, description),
        description_kn = COALESCE(?, description_kn),
        entry_badge = COALESCE(?, entry_badge),
        banner_image = COALESCE(?, banner_image),
        is_featured = COALESCE(?, is_featured),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        title ? String(title).trim() : null,
        title_kn ? String(title_kn).trim() : null,
        event_type || null,
        district ? String(district).trim() : null,
        venue ? String(venue).trim() : null,
        venue_kn ? String(venue_kn).trim() : null,
        event_date || null,
        start_time || null,
        end_time || null,
        cleanCompaniesCount,
        cleanExpectedOpenings,
        eligibility ? String(eligibility).trim() : null,
        eligibility_kn ? String(eligibility_kn).trim() : null,
        batches_eligible ? String(batches_eligible).trim() : null,
        description ? String(description).trim() : null,
        description_kn ? String(description_kn).trim() : null,
        entry_badge || null,
        banner_image || null,
        featuredVal,
        status || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    return res.json({ success: true, message: 'Event updated successfully.' });
  } catch (error) {
    console.error('Update Event Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update event: ' + (error.sqlMessage || error.message) });
  }
});

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete event and registrations
 * @access  Protected (Admin JWT)
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete Event Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
});

/**
 * @route   GET /api/admin/events/:id/attendees
 * @desc    Get paginated attendee roster for a specific event
 * @access  Protected (Admin JWT)
 */
router.get('/events/:id/attendees', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { search, status, district } = req.query;

    // Check event
    const [[event]] = await pool.query('SELECT id, title, event_code, event_date, district, venue FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    let baseFilter = ' WHERE event_id = ?';
    const params = [id];

    if (status && status !== 'all' && status.trim() !== '') {
      baseFilter += ' AND attendance_status = ?';
      params.push(status.trim());
    }

    if (district && district !== 'all' && district.trim() !== '') {
      baseFilter += ' AND district = ?';
      params.push(district.trim());
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      baseFilter += ' AND (full_name LIKE ? OR mobile LIKE ? OR pass_token LIKE ? OR education LIKE ?)';
      params.push(term, term, term, term);
    }

    // 1. Total count
    const countSql = `SELECT COUNT(*) AS total FROM event_registrations ${baseFilter}`;
    const [[countResult]] = await pool.query(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Data
    const dataSql = `
      SELECT * FROM event_registrations
      ${baseFilter}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    return res.json({
      success: true,
      event,
      total,
      page,
      limit,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('Event Attendees Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load attendees.' });
  }
});

/**
 * @route   PUT /api/admin/event-registrations/:id/status
 * @desc    Update attendee attendance status (Registered, Attended, Shortlisted, Absent)
 * @access  Protected (Admin JWT)
 */
router.put('/event-registrations/:id/status', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const [result] = await pool.query(
      'UPDATE event_registrations SET attendance_status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    return res.json({ success: true, message: `Status updated to "${status}".` });
  } catch (error) {
    console.error('Update Attendee Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update attendance status.' });
  }
});

/**
 * @route   GET /api/admin/events/:id/export
 * @desc    Export event attendees list as CSV
 * @access  Protected (Admin JWT)
 */
router.get('/events/:id/export', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [[event]] = await pool.query('SELECT title, event_code, district FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const [rows] = await pool.query(
      `SELECT pass_token, full_name, mobile, email, education, stream, passout_year, district, employment_status, attendance_status, created_at
       FROM event_registrations
       WHERE event_id = ?
       ORDER BY id ASC`,
      [id]
    );

    const headers = [
      'Pass Token',
      'Candidate Name',
      'Mobile',
      'Email',
      'Degree',
      'Stream',
      'Passout Year',
      'District',
      'Employment Status',
      'Attendance Status',
      'Registration Time'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];
    rows.forEach((r) => {
      csvRows.push([
        escapeCsv(r.pass_token),
        escapeCsv(r.full_name),
        escapeCsv(r.mobile),
        escapeCsv(r.email || ''),
        escapeCsv(r.education),
        escapeCsv(r.stream || ''),
        escapeCsv(r.passout_year),
        escapeCsv(r.district),
        escapeCsv(r.employment_status),
        escapeCsv(r.attendance_status),
        escapeCsv(r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '')
      ].join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const filename = `attendees-${event.event_code || id}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export Attendees CSV Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
});

export default router;

