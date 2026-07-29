const express = require('express');
// Shared middleware: accepts the auth cookie (web) or an Authorization: Bearer
// header (Cordova build, where the WebView blocks the third-party cookie).
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { features: featureSchemas } = require('../validation/schemas');

const router = express.Router();

// Get all feature requests
router.get('/', async (req, res) => {
  const pool = req.pool;
  try {
    const result = await pool.query(`
      SELECT 
        f.id, 
        f.user_id, 
        f.title, 
        f.description, 
        f.voters, 
        f.status,
        f.category,
        f.created_at, 
        u.name as author_name 
      FROM feature_requests f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    
    // Calculate upvotes and downvotes based on voters JSONB
    const features = result.rows.map(row => {
      const voters = row.voters || {};
      let upvotes = 0;
      let downvotes = 0;
      
      for (const userId in voters) {
        if (voters[userId] === 'up') upvotes++;
        if (voters[userId] === 'down') downvotes++;
      }
      
      return {
        ...row,
        upvotes,
        downvotes
      };
    });
    
    res.json(features);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new feature request
router.post('/', authenticate, validateRequest({ body: featureSchemas.create }), async (req, res) => {
  const pool = req.pool;
  const { title, description, category } = req.body;
  const userId = req.userId; // Provided by authenticate middleware
  
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO feature_requests (user_id, title, description, category) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, title, description, category || 'Feature']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a feature request
router.post('/:id/vote', authenticate, validateRequest({ params: featureSchemas.idParams, body: featureSchemas.vote }), async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { vote } = req.body; // 'up', 'down', or 'none'
  const userId = req.userId;
  
  if (!['up', 'down', 'none'].includes(vote)) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }
  
  try {
    // Get current voters
    const featureRes = await pool.query('SELECT voters FROM feature_requests WHERE id = $1', [id]);
    if (featureRes.rows.length === 0) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    let voters = featureRes.rows[0].voters || {};
    
    if (vote === 'none') {
      delete voters[userId];
    } else {
      voters[userId] = vote;
    }
    
    const updateRes = await pool.query(
      'UPDATE feature_requests SET voters = $1 WHERE id = $2 RETURNING *',
      [voters, id]
    );
    
    res.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
