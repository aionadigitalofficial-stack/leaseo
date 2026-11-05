/* Run deliberately from Dokploy after backing up the existing database.
 * Uses the app's existing pg dependency; no psql installation required. */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error(), { code: "DATABASE_URL_MISSING" });
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    if (!process.argv.includes("--check")) {
      for (const file of ["whatsapp.sql", "property-contact.sql"]) {
        const sql = fs.readFileSync(path.join(__dirname, "..", "migrations", file), "utf8");
        await client.query(sql);
        console.log(`${file}: migration completed.`);
      }
    }
    const tables = ["whatsapp_settings", "whatsapp_delivery_events", "property_contact_otps",
      "property_contact_access", "notification_templates", "notification_jobs",
      "notification_configuration", "notification_rate_limits"];
    for (const name of tables) {
      const { rows: [row] } = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [name]);
      console.log(`${name}: ${row.present ? "ready" : "MISSING"}`);
      if (!row.present) process.exitCode = 1;
    }
    if (!process.exitCode) console.log("Database ready. Configure Notification Templates in Leaseo Admin.");
  } finally { await client.end().catch(() => {}); }
}
main().catch(error => {
  // Do not print connection strings, provider credentials, or raw SQL payloads.
  const code = typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "MIGRATION_FAILED";
  console.error(`Migration did not complete: ${code}. Check database availability and migration files.`);
  process.exitCode = 1;
});
