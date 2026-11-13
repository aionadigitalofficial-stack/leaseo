import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { phoneLoginSchema, loginProfileValues } from "../shared/phone-login";

test("login validates required fields, all four categories, and optional details", () => {
  const base = { phone: "9000000101", code: "123456", profile: { name: " Sample Person ", userType: "buyer" } };
  assert.equal(phoneLoginSchema.safeParse(base).success, true);
  for (const userType of ["owner", "tenant", "builder_developer", "buyer"]) {
    assert.equal(phoneLoginSchema.safeParse({ ...base, profile: { ...base.profile, userType } }).success, true);
  }
  for (const profile of [
    { name: "", userType: "owner" }, { name: "Sample", userType: "admin" },
    { ...base.profile, email: "not-an-email" }, { ...base.profile, city: "a".repeat(101) },
  ]) assert.equal(phoneLoginSchema.safeParse({ ...base, profile }).success, false);
  assert.equal(phoneLoginSchema.safeParse({ ...base, phone: "+919000000101" }).success, false);
  assert.equal(phoneLoginSchema.safeParse({ ...base, code: "12345" }).success, false);
  assert.equal(phoneLoginSchema.safeParse({ phone: base.phone, code: base.code }).success, true);
  assert.deepEqual(loginProfileValues({ name: " Sample ", userType: "tenant" }), {
    firstName: "Sample", lastName: null, userType: "tenant", email: null, city: null,
  });
});

const url = process.env.LEASEO_TEST_DATABASE_URL;
test("phone login saves enquiry onboarding without bypassing listing or OTP checks", { skip: !url }, async t => {
  if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Dedicated disposable _test database required");
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = "leaseo-isolated-login-test-not-a-production-key";
  const { pool } = await import("./db");
  const { hashPassword, seedRoles, verifyToken } = await import("./auth");
  const { registerPhoneLoginRoutes } = await import("./phone-login");
  await seedRoles();
  const hash = await hashPassword("123456");
  const app = express(); app.use(express.json()); registerPhoneLoginRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  t.after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await pool.end();
  });
  const otp = async (phone: string, options: { purpose?: string; consumed?: boolean; expired?: boolean } = {}) => {
    await pool.query("DELETE FROM otp_requests WHERE phone=$1", [phone]);
    await pool.query(`INSERT INTO otp_requests(phone,code_hash,purpose,expires_at,consumed_at)
      VALUES($1,$2,$3,now()+($4::integer*interval '1 minute'),$5)`,
      [phone, hash, options.purpose || "login", options.expired ? -1 : 10, options.consumed ? new Date() : null]);
  };
  const send = async (phone: string, profile: any = { name: "Sample Person", userType: "buyer" }, code = "123456") => {
    const res = await fetch(`${origin}/api/auth/phone-login`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code, ...(profile === null ? {} : { profile }) }) });
    return { status: res.status, data: await res.json() as any };
  };
  const complete = async (registrationToken: string, profile: any = { name: "New Buyer", userType: "buyer" }) => {
    const res = await fetch(`${origin}/api/auth/phone-login/complete`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationToken, profile }) });
    return { status: res.status, data: await res.json() as any };
  };
  await t.test("buyer can sign up without email or city, preserving listing verification", async () => {
    await otp("9000000101");
    const r = await send("9000000101");
    assert.equal(r.status, 200); assert.equal(r.data.user.userType, "buyer");
    assert.equal(r.data.user.phoneVerified, true); assert.equal(r.data.user.email, null);
    assert.equal(r.data.user.emailVerified, false); assert.equal(r.data.user.profileCompleted, false);
    assert.equal(r.data.user.activeRoleName, "residential_tenant");
    assert.equal(verifyToken(r.data.token)?.userId, r.data.user.id);
    assert.equal((await send("9000000101")).status, 400);
  });
  await t.test("optional email is not verified and city is saved on the account", async () => {
    await otp("9000000102");
    const r = await send("9000000102", { name: "Property Owner", userType: "owner",
      email: "Owner-Login@Example.invalid", city: " Mumbai " });
    assert.equal(r.status, 200); assert.equal(r.data.user.email, "owner-login@example.invalid");
    assert.equal(r.data.user.emailVerified, false); assert.equal(r.data.user.activeRoleName, "residential_owner");
    const { rows: [row] } = await pool.query("SELECT metadata FROM users WHERE id=$1", [r.data.user.id]);
    assert.equal(row.metadata.city, "Mumbai");
  });
  await t.test("builder and tenant values persist", async () => {
    for (const [phone, userType] of [["9000000103", "builder_developer"], ["9000000104", "tenant"]]) {
      await otp(phone); const r = await send(phone, { name: "Sample", userType });
      assert.equal(r.status, 200); assert.equal(r.data.user.userType, userType);
    }
  });
  await t.test("returning completed accounts are not overwritten or granted owner/admin permissions", async () => {
    const { rows: [before] } = await pool.query("UPDATE users SET profile_completed=true WHERE phone='9000000101' RETURNING *");
    await otp("9000000101");
    const r = await send("9000000101", { name: "Wrong Person", userType: "owner", email: "wrong@example.invalid", city: "Wrong City" });
    assert.equal(r.status, 200); assert.equal(r.data.user.id, before.id);
    assert.equal(r.data.user.firstName, before.first_name); assert.equal(r.data.user.userType, "buyer");
    assert.equal(r.data.user.email, null); assert.equal(r.data.user.isAdmin, false);
    assert.equal(r.data.user.activeRoleName, "residential_tenant");
  });
  await t.test("email conflict does not merge accounts or consume the correct OTP", async () => {
    await otp("9000000105");
    assert.equal((await send("9000000105", { name: "Sample", userType: "tenant", email: "owner-login@example.invalid" })).status, 409);
    assert.equal((await send("9000000105")).status, 200);
  });
  await t.test("invalid, consumed, expired and wrong-purpose OTPs create no accounts", async () => {
    for (const options of [{ consumed: true }, { expired: true }, { purpose: "verify_phone" }]) {
      await otp("9000000106", options);
      assert.equal((await send("9000000106")).status, 400);
    }
    await otp("9000000106");
    for (let i = 0; i < 3; i++) assert.equal((await send("9000000106", undefined, "000000")).status, 400);
    assert.match((await send("9000000106")).data.error, /Too many attempts/);
    const { rows: [row] } = await pool.query("SELECT count(*)::int AS count FROM users WHERE phone='9000000106'");
    assert.equal(row.count, 0);
  });
  await t.test("concurrent submissions consume the OTP only once", async () => {
    await otp("9000000107");
    const results = await Promise.all([send("9000000107"), send("9000000107")]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
    const { rows: [row] } = await pool.query("SELECT count(*)::int AS count FROM users WHERE phone='9000000107'");
    assert.equal(row.count, 1);
  });
  await t.test("inactive accounts are blocked", async () => {
    await pool.query("UPDATE users SET is_active=false WHERE phone='9000000104'");
    await otp("9000000104");
    assert.equal((await send("9000000104")).status, 403);
  });
  await t.test("existing international-format phone matches the same account", async () => {
    const { rows: [before] } = await pool.query("UPDATE users SET phone='919000000103' WHERE phone='9000000103' RETURNING id");
    await otp("9000000103"); const r = await send("9000000103");
    assert.equal(r.status, 200); assert.equal(r.data.user.id, before.id);
  });
  await t.test("returning account needs only mobile and OTP, even without listing-profile completion", async () => {
    await otp("9000000102");
    const r = await send("9000000102", null);
    assert.equal(r.status, 200); assert.equal(r.data.user.firstName, "Property");
    assert.equal(r.data.user.profileCompleted, false);
    assert.equal(r.data.user.email, "owner-login@example.invalid");
    assert.equal(r.data.needsProfile, undefined);
    assert.ok(verifyToken(r.data.token));
  });
  await t.test("new number gets a signup-only proof after OTP, then creates its account with no second OTP", async () => {
    await otp("9000000110");
    const r = await send("9000000110", null);
    assert.equal(r.status, 200); assert.equal(r.data.needsProfile, true);
    assert.equal(r.data.token, undefined); assert.equal(r.data.user, undefined);
    assert.equal(verifyToken(r.data.registrationToken), null, "Signup proof cannot authenticate as a user");
    const { rows: [before] } = await pool.query("SELECT count(*)::int AS count FROM users WHERE phone='9000000110'");
    assert.equal(before.count, 0);
    assert.equal((await send("9000000110", null)).status, 400, "OTP is already consumed");
    assert.equal((await complete(r.data.registrationToken, { name: "", userType: "buyer" })).status, 400);
    assert.equal((await complete(r.data.registrationToken, { name: "Sample", userType: "buyer",
      email: "owner-login@example.invalid" })).status, 409);
    const saved = await complete(r.data.registrationToken, {
      name: "First Time Customer", userType: "tenant", city: "Pune",
    });
    assert.equal(saved.status, 200); assert.equal(saved.data.user.phone, "9000000110");
    assert.equal(saved.data.user.firstName, "First"); assert.equal(saved.data.user.email, null);
    assert.equal(saved.data.user.phoneVerified, true); assert.equal(saved.data.user.emailVerified, false);
    assert.equal(saved.data.user.profileCompleted, false);
    assert.equal((await complete(r.data.registrationToken)).status, 410);
    await otp("9000000110");
    const returning = await send("9000000110", null);
    assert.equal(returning.status, 200); assert.equal(returning.data.user.id, saved.data.user.id);
    assert.equal(returning.data.needsProfile, undefined);
  });
  await t.test("unverified, forged, expired and ordinary session tokens cannot create profiles", async () => {
    const { createHmac } = await import("node:crypto");
    const { default: jwt } = await import("jsonwebtoken");
    const { rows: [before] } = await pool.query("SELECT count(*)::int AS count FROM users");
    await otp("9000000111");
    const r = await send("9000000111", null);
    const claims = jwt.decode(r.data.registrationToken) as jwt.JwtPayload;
    const expired = jwt.sign({ phone: claims.phone, otpId: claims.otpId, purpose: "phone-signup" },
      createHmac("sha256", process.env.JWT_SECRET!).update("leaseo:verified-phone-signup:v1").digest("hex"),
      { algorithm: "HS256", issuer: "leaseo-phone-login", audience: "leaseo-phone-signup", expiresIn: -1 });
    const { generateToken } = await import("./auth");
    for (const token of ["forged", expired, r.data.registrationToken.slice(0, -10) + "invalidsig",
      generateToken({ userId: "nonexistent", email: null, isAdmin: false })]) {
      assert.equal((await complete(token)).status, 410);
    }
    const { rows: [after] } = await pool.query("SELECT count(*)::int AS count FROM users");
    assert.equal(after.count, before.count);
  });
  await t.test("signup completion is single-use under concurrent requests", async () => {
    await otp("9000000112");
    const r = await send("9000000112", null);
    const results = await Promise.all([complete(r.data.registrationToken), complete(r.data.registrationToken)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 410]);
  });
  await t.test("changing the number or requesting a fresh OTP invalidates the earlier signup proof", async () => {
    await otp("9000000113");
    const r = await send("9000000113", null);
    await otp("9000000113"); // Existing sender replaces the old OTP record.
    assert.equal((await complete(r.data.registrationToken)).status, 410);
  });
});
