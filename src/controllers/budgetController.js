const pool = require('../config/db');

// Helper to normalize date to the first of the month (YYYY-MM-01)
const normalizeToFirstOfMonth = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // Expecting YYYY-MM-DD or YYYY-MM
    
    let targetMonth = month ? normalizeToFirstOfMonth(month) : normalizeToFirstOfMonth(new Date());
    if (!targetMonth) {
      return res.status(400).json({ error: 'Invalid month format' });
    }

    const query = `
      SELECT 
        b.id,
        b.category_id,
        b.month_year,
        b.limit_amount,
        c.name as category_name,
        COALESCE(
          (SELECT SUM(t.amount) 
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE (a.user_id = b.user_id OR (a.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL))
             AND t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.transaction_date >= b.month_year
             AND t.transaction_date < b.month_year + INTERVAL '1 month'
          ), 0
        ) as current_spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE (b.user_id = $1 OR (b.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL))
        AND b.month_year = $2
      ORDER BY c.name ASC
    `;

    const result = await pool.query(query, [userId, targetMonth]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.upsertBudget = async (req, res) => {
  try {
    const { category_id, limit_amount, month_year } = req.body;
    const userId = req.user.id;

    if (!category_id || limit_amount === undefined || !month_year) {
      return res.status(400).json({ error: 'category_id, limit_amount, and month_year required' });
    }

    const targetMonth = normalizeToFirstOfMonth(month_year);
    if (!targetMonth) {
      return res.status(400).json({ error: 'Invalid month_year format' });
    }

    // Verify category exists and belongs to the user/household
    const catCheck = await pool.query(
      `SELECT id FROM categories 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`, 
      [category_id, userId]
    );
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Upsert budget limit
    const query = `
      INSERT INTO budgets (user_id, category_id, month_year, limit_amount)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, category_id, month_year)
      DO UPDATE SET limit_amount = EXCLUDED.limit_amount
      RETURNING *
    `;

    const result = await pool.query(query, [userId, category_id, targetMonth, parseFloat(limit_amount)]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error upserting budget:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully', budget: result.rows[0] });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
