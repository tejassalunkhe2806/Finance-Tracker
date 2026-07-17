const pool = require('../config/db');

exports.getTags = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Tag name required' });
    }

    const result = await pool.query(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, color || '#64748b']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating tag:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Tag already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully', tag: result.rows[0] });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
