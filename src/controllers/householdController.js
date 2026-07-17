const pool = require('../config/db');
const crypto = require('crypto');

exports.createHousehold = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Household name required' });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    await client.query('BEGIN');

    // 1. Insert household
    const houseRes = await client.query(
      'INSERT INTO households (name, invite_code) VALUES ($1, $2) RETURNING *',
      [name, inviteCode]
    );
    const household = houseRes.rows[0];

    // 2. Link user
    await client.query(
      'UPDATE users SET household_id = $1 WHERE id = $2',
      [household.id, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(household);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating household:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.joinHousehold = async (req, res) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code required' });
    }

    const houseRes = await pool.query(
      'SELECT id, name FROM households WHERE invite_code = $1',
      [invite_code.trim().toUpperCase()]
    );

    if (houseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code. Household not found.' });
    }

    const household = houseRes.rows[0];

    await pool.query(
      'UPDATE users SET household_id = $1 WHERE id = $2',
      [household.id, userId]
    );

    res.json({ message: `Successfully joined household: ${household.name}`, household });
  } catch (err) {
    console.error('Error joining household:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getHousehold = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await pool.query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    const householdId = userRes.rows[0]?.household_id;

    if (!householdId) {
      return res.json(null);
    }

    const houseRes = await pool.query(
      'SELECT * FROM households WHERE id = $1',
      [householdId]
    );
    
    // Fetch members
    const membersRes = await pool.query(
      'SELECT id, email, full_name FROM users WHERE household_id = $1 ORDER BY full_name ASC',
      [householdId]
    );

    res.json({
      ...houseRes.rows[0],
      members: membersRes.rows
    });
  } catch (err) {
    console.error('Error fetching household:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.leaveHousehold = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(
      'UPDATE users SET household_id = NULL WHERE id = $1',
      [userId]
    );
    res.json({ message: 'Successfully left household' });
  } catch (err) {
    console.error('Error leaving household:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
