const pool = require('../config/db');

exports.addTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { account_id, amount, description, transaction_date, type, category_id } = req.body;
    const userId = req.user.id;

    if (!account_id || !amount || !transaction_date || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const accountCheck = await client.query(
      'SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2',
      [account_id, userId]
    );
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Account not found' });
    }

    const account = accountCheck.rows[0];
    let newBalance;

    if (type === 'income') {
      newBalance = parseFloat(account.balance) + parseFloat(amount);
    } else if (type === 'expense') {
      newBalance = parseFloat(account.balance) - parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'Type must be "income" or "expense"' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO transactions (account_id, category_id, amount, description, transaction_date, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [account_id, category_id || null, amount, description || null, transaction_date, type]
    );

    await client.query(
      'UPDATE accounts SET balance = $1 WHERE id = $2',
      [newBalance, account_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      transaction: result.rows[0],
      new_balance: newBalance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// Get all transactions for the user
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT t.*, a.name as account_name 
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.transaction_date DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};