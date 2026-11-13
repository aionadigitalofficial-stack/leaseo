/* Run inside the existing Dokploy application container after a database backup. */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database configuration missing");
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    if (!process.argv.includes("--check")) {
      await client.query(fs.readFileSync(path.join(__dirname, "../migrations/phone-login.sql"), "utf8"));
    }
    const { rows: [row] } = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='user_type' AND e.enumlabel='buyer') AS ready"
    );
    console.log(row.ready ? "Phone login buyer category: ready" : "Phone login buyer category: MISSING");
    if (!row.ready) process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }
}
main().catch(() => {
  console.error("Phone login migration failed. Check database availability and the user_type enum.");
  process.exitCode = 1;
});
