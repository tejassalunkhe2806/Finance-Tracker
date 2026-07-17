const pool = require('../config/db');
const { processRecurring } = require('./recurringController');

exports.addTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { account_id, to_account_id, amount, description, transaction_date, type, category_id, tag_ids } = req.body;
    const userId = req.user.id;

    if (!account_id || !amount || !transaction_date || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify source account belongs to user/household
    const accountCheck = await client.query(
      `SELECT id, balance FROM accounts 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [account_id, userId]
    );
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Source account not found' });
    }

    const account = accountCheck.rows[0];
    let sourceNewBalance = parseFloat(account.balance);
    let destNewBalance = null;

    await client.query('BEGIN');

    if (type === 'income') {
      sourceNewBalance += parseFloat(amount);
    } else if (type === 'expense') {
      sourceNewBalance -= parseFloat(amount);
    } else if (type === 'transfer') {
      if (!to_account_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Destination account required for transfer' });
      }
      if (String(account_id) === String(to_account_id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Source and destination accounts must be different' });
      }

      // Verify destination account belongs to user/household
      const destCheck = await client.query(
        `SELECT id, balance FROM accounts 
         WHERE id = $1 
           AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
        [to_account_id, userId]
      );
      if (destCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Destination account not found' });
      }

      const destAccount = destCheck.rows[0];
      sourceNewBalance -= parseFloat(amount);
      destNewBalance = parseFloat(destAccount.balance) + parseFloat(amount);

      // Update destination account balance
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [destNewBalance, to_account_id]);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // 1. Insert transaction
    const result = await client.query(
      `INSERT INTO transactions (account_id, to_account_id, category_id, amount, description, transaction_date, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [account_id, to_account_id || null, category_id || null, amount, description || null, transaction_date, type]
    );
    const transaction = result.rows[0];

    // 2. Insert transaction-tag mappings if provided
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await client.query(
          'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ($1, $2)',
          [transaction.id, tagId]
        );
      }
    }

    // 3. Update source account balance
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [sourceNewBalance, account_id]);

    await client.query('COMMIT');

    // Fetch complete transaction with tags to return
    const fullTxResult = await pool.query(
      `SELECT t.*, a.name as account_name,
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color))
                FROM transaction_tags tt
                JOIN tags tg ON tt.tag_id = tg.id
                WHERE tt.transaction_id = t.id
              ), '[]') as tags
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1`,
      [transaction.id]
    );

    res.status(201).json({
      transaction: fullTxResult.rows[0],
      new_balance: sourceNewBalance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-process any pending/due recurring transactions first
    await processRecurring(userId);

    const result = await pool.query(
      `SELECT t.*, a.name as account_name, dest.name as to_account_name,
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color))
                FROM transaction_tags tt
                JOIN tags tg ON tt.tag_id = tg.id
                WHERE tt.transaction_id = t.id
              ), '[]') as tags
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       LEFT JOIN accounts dest ON t.to_account_id = dest.id
       WHERE a.user_id = $1
          OR (a.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $1))
              AND (SELECT household_id FROM users WHERE id = $1) IS NOT NULL)
       ORDER BY t.transaction_date DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { account_id, to_account_id, amount, description, transaction_date, type, category_id, tag_ids } = req.body;
    const userId = req.user.id;

    if (!account_id || !amount || !transaction_date || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    // 1. Fetch old transaction to check existence and details
    const oldTxRes = await client.query(
      `SELECT t.* 
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 
         AND (a.user_id = $2 OR (a.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [id, userId]
    );

    if (oldTxRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldTx = oldTxRes.rows[0];

    // 2. Revert impact of old transaction
    // Revert source account
    const oldSourceAccRes = await client.query('SELECT balance FROM accounts WHERE id = $1', [oldTx.account_id]);
    let revertedSourceBalance = parseFloat(oldSourceAccRes.rows[0].balance);
    if (oldTx.type === 'income') {
      revertedSourceBalance -= parseFloat(oldTx.amount);
    } else {
      revertedSourceBalance += parseFloat(oldTx.amount); // Reverts expense and transfer debit
    }
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [revertedSourceBalance, oldTx.account_id]);

    // Revert destination account if old transaction was a transfer
    if (oldTx.type === 'transfer' && oldTx.to_account_id) {
      const oldDestAccRes = await client.query('SELECT balance FROM accounts WHERE id = $1', [oldTx.to_account_id]);
      let revertedDestBalance = parseFloat(oldDestAccRes.rows[0].balance) - parseFloat(oldTx.amount);
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [revertedDestBalance, oldTx.to_account_id]);
    }

    // 3. Apply impact of new transaction
    // Read fresh balances of the target accounts
    const newSourceAccRes = await client.query(
      `SELECT balance FROM accounts 
       WHERE id = $1 
         AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [account_id, userId]
    );
    if (newSourceAccRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Source account not found' });
    }

    let sourceNewBalance = parseFloat(newSourceAccRes.rows[0].balance);
    if (type === 'income') {
      sourceNewBalance += parseFloat(amount);
    } else if (type === 'expense') {
      sourceNewBalance -= parseFloat(amount);
    } else if (type === 'transfer') {
      if (!to_account_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Destination account required for transfer' });
      }
      if (String(account_id) === String(to_account_id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Source and destination accounts must be different' });
      }

      const newDestAccRes = await client.query(
        `SELECT balance FROM accounts 
         WHERE id = $1 
           AND (user_id = $2 OR (user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
        [to_account_id, userId]
      );
      if (newDestAccRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Destination account not found' });
      }

      sourceNewBalance -= parseFloat(amount);
      let destNewBalance = parseFloat(newDestAccRes.rows[0].balance) + parseFloat(amount);

      // Update new destination account balance
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [destNewBalance, to_account_id]);
    }

    // Update new source account balance
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [sourceNewBalance, account_id]);

    // 4. Update the transaction row
    await client.query(
      `UPDATE transactions 
       SET account_id = $1, to_account_id = $2, category_id = $3, amount = $4, description = $5, transaction_date = $6, type = $7
       WHERE id = $8`,
      [account_id, to_account_id || null, category_id || null, amount, description || null, transaction_date, type, id]
    );

    // 5. Update tags (clear and insert new)
    await client.query('DELETE FROM transaction_tags WHERE transaction_id = $1', [id]);
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await client.query(
          'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch the updated transaction with tags
    const fullTxResult = await pool.query(
      `SELECT t.*, a.name as account_name,
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color))
                FROM transaction_tags tt
                JOIN tags tg ON tt.tag_id = tg.id
                WHERE tt.transaction_id = t.id
              ), '[]') as tags
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1`,
      [id]
    );

    res.json({
      message: 'Transaction updated successfully',
      transaction: fullTxResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.deleteTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // 1. Fetch transaction to check existence and details
    const txRes = await client.query(
      `SELECT t.* 
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 
         AND (a.user_id = $2 OR (a.user_id IN (SELECT id FROM users WHERE household_id = (SELECT household_id FROM users WHERE id = $2)) AND (SELECT household_id FROM users WHERE id = $2) IS NOT NULL))`,
      [id, userId]
    );

    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txRes.rows[0];

    // 2. Revert impact on the accounts
    // Revert source account
    const sourceAccRes = await client.query('SELECT balance FROM accounts WHERE id = $1', [tx.account_id]);
    let newSourceBalance = parseFloat(sourceAccRes.rows[0].balance);
    if (tx.type === 'income') {
      newSourceBalance -= parseFloat(tx.amount);
    } else {
      newSourceBalance += parseFloat(tx.amount);
    }
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newSourceBalance, tx.account_id]);

    // Revert destination account if it was a transfer
    if (tx.type === 'transfer' && tx.to_account_id) {
      const destAccRes = await client.query('SELECT balance FROM accounts WHERE id = $1', [tx.to_account_id]);
      let newDestBalance = parseFloat(destAccRes.rows[0].balance) - parseFloat(tx.amount);
      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newDestBalance, tx.to_account_id]);
    }

    // 3. Delete transaction
    const result = await client.query(
      'DELETE FROM transactions WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Transaction deleted successfully',
      transaction: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};