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

export default router;
