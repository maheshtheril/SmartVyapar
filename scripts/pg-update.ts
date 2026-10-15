import { Client } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  console.log("Connecting using direct URL (non-pooled)...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to PostgreSQL successfully!");

  const u = await client.query(
    "UPDATE users SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com') WHERE email LIKE '%@smartvyapar.app' RETURNING id, email, name, role;"
  );
  console.log("Updated user emails:", u.rows);

  const t = await client.query(
    "UPDATE tenants SET email = REPLACE(email, '@smartvyapar.app', '@zionapos.com') WHERE email LIKE '%@smartvyapar.app' RETURNING id, slug, email;"
  );
  console.log("Updated tenant emails:", t.rows);

  const finalUsers = await client.query(
    "SELECT id, email, name, role FROM users WHERE email LIKE '%@zionapos.com';"
  );
  console.log("\nALL CURRENT ZIONAPOS USERS:", finalUsers.rows);

  await client.end();
}

run().catch((err) => {
  console.error("PG Error:", err);
  process.exit(1);
});
