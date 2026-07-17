const pool = require('./db');

async function runMigration() {
  console.log('🔄 Running Database Migrations for Category A & B Updates...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create refresh_tokens table
    console.log('Creating refresh_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create tags table
    console.log('Creating tags table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20) DEFAULT '#64748b',
        UNIQUE(user_id, name)
      );
    `);

    // 3. Create transaction_tags junction table
    console.log('Creating transaction_tags junction table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_tags (
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (transaction_id, tag_id)
      );
    `);

    // 4. Update accounts check constraint to include UPI and Card
    console.log('Updating accounts type check constraint...');
    await client.query(`
      ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
      ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('checking','savings','credit','cash','UPI','card'));
    `);

    // 5. Create households table
    console.log('Creating households table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS households (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        invite_code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Add household_id to users
    console.log('Adding household_id to users...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE SET NULL;
    `);

    // 7. Modify transactions table for transfers
    console.log('Modifying transactions for transfers...');
    await client.query(`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE;
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
      ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));
    `);

    // 8. Create goals table
    console.log('Creating goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        target_amount DECIMAL(12, 2) NOT NULL,
        current_amount DECIMAL(12, 2) DEFAULT 0.00,
        target_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Create recurring_transactions table
    console.log('Creating recurring_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description VARCHAR(255),
        type VARCHAR(10) CHECK (type IN ('income', 'expense')),
        frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        next_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigration;

// If run directly from terminal
if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}
