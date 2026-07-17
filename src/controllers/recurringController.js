const pool = require('../config/db');

// Utility to process due recurring transactions for a user/household
exports.processRecurring = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch active templates where next_date <= TODAY
    const dueTemplatesRes = await client.query(
      `SELECT rt.*, a.balance as account_balance
       FROM recurring_transactions rt
       JOIN accounts a ON rt.account_id = a.id
       WHERE rt.is_active = TRUE
         AND rt.next_date <= CURRENT_DATE
         AND (rt.user_id = $1 OR (rt.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1)) AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL))`,
      [userId]
    );

    for (const template of dueTemplatesRes.rows) {
      let currentNextDate = new Date(template.next_date);
      const today = new Date();

      // Post transactions for all missed dates up to today
      while (currentNextDate <= today) {
        const formattedDate = currentNextDate.toISOString().split('T')[0];

        // 1. Post transaction
        await client.query(
          `INSERT INTO transactions (account_id, category_id, amount, description, transaction_date, type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            template.account_id,
            template.category_id,
            template.amount,
            template.description ? `[Recurring] ${template.description}` : '[Recurring] Scheduled Transaction',
            formattedDate,
            template.type
          ]
        );

        // 2. Fetch current balance
        const accRes = await client.query('SELECT balance FROM accounts WHERE id = $1', [template.account_id]);
        const currentBalance = parseFloat(accRes.rows[0].balance);
        let newBalance = currentBalance;

        if (template.type === 'income') {
          newBalance += parseFloat(template.amount);
        } else {
          newBalance -= parseFloat(template.amount);
        }

        // 3. Update account balance
        await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, template.account_id]);

        // 4. Advance currentNextDate based on frequency
        if (template.frequency === 'daily') {
          currentNextDate.setDate(currentNextDate.getDate() + 1);
        } else if (template.frequency === 'weekly') {
          currentNextDate.setDate(currentNextDate.getDate() + 7);
        } else if (template.frequency === 'monthly') {
          currentNextDate.setMonth(currentNextDate.getMonth() + 1);
        } else if (template.frequency === 'yearly') {
          currentNextDate.setFullYear(currentNextDate.getFullYear() + 1);
        }
      }

      // 5. Update the template's next_date in DB
      await client.query(
        'UPDATE recurring_transactions SET next_date = $1 WHERE id = $2',
        [currentNextDate.toISOString().split('T')[0], template.id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing recurring transactions:', err);
  } finally {
    client.release();
  }
};

exports.getRecurring = async (req, res) => {
  try {
    const userId = req.user.id;

    // Run auto-processor first so list is updated
    await exports.processRecurring(userId);

    const result = await pool.query(
      `SELECT rt.*, a.name as account_name, c.name as category_name
       FROM recurring_transactions rt
       JOIN accounts a ON rt.account_id = a.id
       LEFT JOIN categories c ON rt.category_id = c.id
       WHERE rt.user_id = $1
          OR (rt.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1))
              AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
       ORDER BY rt.next_date ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recurring templates:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createRecurring = async (req, res) => {
  try {
    const { account_id, category_id, amount, description, type, frequency, next_date } = req.body;
    const userId = req.user.id;

    if (!account_id || !amount || !type || !frequency || !next_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify account exists
    const accCheck = await pool.query(
      `SELECT id FROM accounts 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [account_id, userId]
    );

    if (accCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Account not found' });
    }

    const result = await pool.query(
      `INSERT INTO recurring_transactions (user_id, account_id, category_id, amount, description, type, frequency, next_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, account_id, category_id || null, amount, description || null, type, frequency, next_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating recurring template:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteRecurring = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM recurring_transactions 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring template not found' });
    }

    res.json({ message: 'Recurring transaction cancelled successfully', template: result.rows[0] });
  } catch (err) {
    console.error('Error deleting recurring template:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
