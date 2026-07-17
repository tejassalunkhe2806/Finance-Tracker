const pool = require('../config/db');

exports.createAccount = async (req, res) => {
  try {
    const { name, type, balance } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }

    const result = await pool.query(
      'INSERT INTO accounts (user_id, name, type, balance) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, type, balance || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET all accounts for the user
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM accounts 
       WHERE user_id = $1 
          OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) 
              AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE an account
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully', account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};