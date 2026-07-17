const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

console.log('🔍 Connecting to:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // SSL is disabled for local development
  connectionTimeoutMillis: 30000,
});

async function test() {
  try {
    console.log('⏳ Connecting...');
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Success:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.error(err.stack);
    await client.end();
  }
}

test();