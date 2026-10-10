import express from 'express';
import { getPool } from '../db/database.js';

const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Public search and listing for career opportunities with 10 items per page
 * @query   page (default 1), limit (default 10), search, district, category, jobType, experience
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const { search, district, category, jobType, experience } = req.query;

    let baseFilter = ' WHERE status = "active"';
    const params = [];

    // Search query matches title, company, skills, qualification, and description
    if (search && search.trim() !== '') {
      baseFilter += ' AND (title LIKE ? OR company LIKE ? OR skills LIKE ? OR qualification LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    // District filter
    if (district && district !== 'all' && district.trim() !== '') {
      baseFilter += ' AND (district = ? OR district = "All Districts / Karnataka-Wide")';
      params.push(district.trim());
    }

    // Category filter
    if (category && category !== 'all' && category.trim() !== '') {
      baseFilter += ' AND category = ?';
      params.push(category.trim());
    }

    // Job Type filter
    if (jobType && jobType !== 'all' && jobType.trim() !== '') {
      baseFilter += ' AND job_type = ?';
      params.push(jobType.trim());
    }

    // Experience filter
    if (experience && experience !== 'all' && experience.trim() !== '') {
      baseFilter += ' AND experience LIKE ?';
      params.push(`%${experience.trim()}%`);
    }

    // 1. Get total count for pagination
    const countQuery = `SELECT COUNT(*) AS total FROM jobs ${baseFilter}`;
    const [[countResult]] = await pool.query(countQuery, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2. Query paginated results
    const dataQuery = `
      SELECT id, title, company, category, job_type, district, taluk, 
             qualification, experience, passing_year, salary, openings, 
             deadline, apply_url, description, skills, status, source_note, created_at
      FROM jobs 
      ${baseFilter}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [jobs] = await pool.query(dataQuery, queryParams);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
      data: jobs
    });
  } catch (error) {
    console.error('Jobs Search API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve opportunities.',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job details
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const jobId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      'SELECT * FROM jobs WHERE id = ? LIMIT 1',
      [jobId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.'
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Job Details API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve job details.'
    });
  }
});

export default router;
