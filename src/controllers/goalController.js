const pool = require('../config/db');

exports.getGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM goals 
       WHERE user_id = $1 
          OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) 
              AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
       ORDER BY target_date ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const { name, target_amount, current_amount, target_date } = req.body;
    const userId = req.user.id;

    if (!name || !target_amount || !target_date) {
      return res.status(400).json({ error: 'name, target_amount, and target_date required' });
    }

    const result = await pool.query(
      'INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, target_amount, current_amount || 0.00, target_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating goal:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_amount, current_amount, target_date } = req.body;
    const userId = req.user.id;

    const goalCheck = await pool.query(
      `SELECT id FROM goals 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [id, userId]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const result = await pool.query(
      `UPDATE goals 
       SET name = COALESCE($1, name), 
           target_amount = COALESCE($2, target_amount), 
           current_amount = COALESCE($3, current_amount), 
           target_date = COALESCE($4, target_date) 
       WHERE id = $5 RETURNING *`,
      [name, target_amount, current_amount, target_date, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating goal:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM goals 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL)) 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully', goal: result.rows[0] });
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
