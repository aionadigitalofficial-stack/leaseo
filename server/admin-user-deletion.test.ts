import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { matchesAdminUser } from "../shared/admin-user-search";

test("admin user search matches name, email and formatted phone numbers", () => {
  const account = { firstName: "Sample", lastName: "Renter", email: "renter@example.invalid", phone: "919000000101" };
  for (const query of ["", "sample   RENTER", "EXAMPLE.INVALID", "+91 90000-00101", "9000000101", "00101"]) {
    assert.equal(matchesAdminUser(account, query), true, query);
  }
  for (const query of ["another account", "000102", "+"]) {
    assert.equal(matchesAdminUser(account, query), false, query);
  }
  assert.equal(matchesAdminUser({ phone: "9000000101" }, "+919000000101"), true);
  assert.equal(matchesAdminUser({ phone: null }, "00101"), false);
});

const testUrl = process.env.LEASEO_TEST_DATABASE_URL;
test("only an admin can remove an unlinked account; protected records remain unchanged", { skip: !testUrl }, async t => {
  if (!testUrl || !new URL(testUrl).pathname.endsWith("_test")) throw new Error("Dedicated disposable _test database required");
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET = "leaseo-isolated-account-deletion-test-not-for-production";
  const { pool } = await import("./db");
  const { generateToken, seedRoles } = await import("./auth");
  const { registerAdminUserDeletion } = await import("./admin-user-deletion");
  await seedRoles();

  const app = express();
  registerAdminUserDeletion(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await pool.end();
  });
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("Test server unavailable");

  const create = async (roleName: string) => {
    const id = randomUUID();
    const { rows: [role] } = await pool.query("SELECT id FROM roles WHERE name=$1", [roleName]);
    await pool.query("INSERT INTO users (id, active_role_id) VALUES ($1,$2)", [id, role.id]);
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)", [id, role.id]);
    return id;
  };
  const addCredentials = async (id: string) => {
    await pool.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,'test',now()+interval '1 hour')", [id]);
    await pool.query("INSERT INTO otp_requests (user_id, code_hash, expires_at) VALUES ($1,'test',now()+interval '1 hour')", [id]);
  };
  const count = async (table: "users" | "user_roles" | "refresh_tokens" | "otp_requests" | "payments", id: string) => {
    const column = table === "users" ? "id" : "user_id";
    const { rows: [result] } = await pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE ${column}=$1`, [id]);
    return result.count;
  };
  const remove = (id: string, actor?: string) => fetch(`http://127.0.0.1:${address.port}/api/admin/login-users/${id}`, {
    method: "DELETE",
    // Actual permissions must come from the DB, not the JWT's role hint.
    headers: actor ? { Authorization: `Bearer ${generateToken({ userId: actor, email: null, isAdmin: true })}` } : {},
  });

  const admin = await create("admin");
  const otherAdmin = await create("admin");
  const unlinked = await create("residential_tenant");
  const linked = await create("residential_tenant");
  await addCredentials(unlinked);
  await addCredentials(linked);
  await pool.query("INSERT INTO payments (user_id, amount) VALUES ($1,10)", [linked]);

  assert.equal((await remove(unlinked)).status, 401);
  assert.equal((await remove(unlinked, linked)).status, 403);
  assert.equal((await remove(admin, admin)).status, 403);
  assert.equal((await remove(otherAdmin, admin)).status, 403);
  assert.equal(await count("users", otherAdmin), 1);

  const blocked = await remove(linked, admin);
  assert.equal(blocked.status, 409);
  assert.match((await blocked.json()).error, /linked records/);
  for (const table of ["users", "user_roles", "refresh_tokens", "otp_requests", "payments"] as const) {
    assert.equal(await count(table, linked), 1, table);
  }

  const deleted = await remove(unlinked, admin);
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { success: true });
  for (const table of ["users", "user_roles", "refresh_tokens", "otp_requests"] as const) {
    assert.equal(await count(table, unlinked), 0, table);
  }
  assert.equal((await remove(unlinked, admin)).status, 404);
});
