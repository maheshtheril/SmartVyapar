const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  console.log("Tables:", res.rows.map(r => r.table_name));
  await client.end();
  process.exit(0);
}

run().catch(console.error);
