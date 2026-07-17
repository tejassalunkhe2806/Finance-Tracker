const pool = require('../config/db');

// Default categories to seed for new users
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investment', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Other Expense', type: 'expense' }
];

exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if the user/household has any categories
    let result = await pool.query(
      `SELECT * FROM categories 
       WHERE user_id = $1 
          OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) 
              AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
       ORDER BY name ASC`,
      [userId]
    );

    // Seed defaults if none exist
    if (result.rows.length === 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const cat of DEFAULT_CATEGORIES) {
          await client.query(
            'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING',
            [userId, cat.name, cat.type]
          );
        }
        await client.query('COMMIT');
        
        // Fetch again after seeding
        result = await client.query(
          `SELECT * FROM categories 
           WHERE user_id = $1 
              OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) 
                  AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
           ORDER BY name ASC`,
          [userId]
        );
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching/seeding categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Type must be "income" or "expense"' });
    }

    // Insert new category
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully', category: result.rows[0] });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
