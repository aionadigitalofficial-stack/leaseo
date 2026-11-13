import type { Express, Response } from "express";
import { and, eq, gt, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { otpRequests, roles, users, userRoles } from "@shared/schema";
import { loginProfileValues, phoneLoginSchema, phoneSignupSchema } from "@shared/phone-login";
import { db } from "./db";
import { generateToken, getAuthUser, verifyPassword } from "./auth";
import { createPhoneSignupToken, readPhoneSignupToken } from "./phone-signup-token";

class LoginError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type LoginTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function createPhoneAccount(tx: LoginTx, phone: string, details: ReturnType<typeof loginProfileValues>) {
  if (details.email) {
    const [claimed] = await tx.select({ id: users.id }).from(users)
      .where(sql`lower(${users.email}) = ${details.email}`).limit(1);
    if (claimed) throw new LoginError(409, "This email is already associated with another account. Leave it blank or use a different email.");
  }
  const roleName = ["owner", "builder_developer"].includes(details.userType)
    ? "residential_owner" : "residential_tenant";
  const [role] = await tx.select().from(roles).where(eq(roles.name, roleName));
  if (!role) throw new LoginError(503, "Account roles are not configured. Please contact support.");
  const [user] = await tx.insert(users).values({
    phone, phoneVerifiedAt: new Date(), firstName: details.firstName, lastName: details.lastName,
    userType: details.userType, email: details.email, emailVerifiedAt: null,
    activeRoleId: role.id, isActive: true,
    // Enquiry onboarding never bypasses existing listing-verification rules.
    profileCompleted: false, metadata: details.city ? { city: details.city } : {},
  }).returning();
  await tx.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();
  return user;
}

async function signedIn(res: Response, userId: string) {
  const user = await getAuthUser(userId);
  if (!user) throw new LoginError(500, "Unable to load your account. Please sign in again.");
  const token = generateToken({ userId: user.id, email: user.email, isAdmin: user.isAdmin });
  return res.json({ success: true, token, user });
}

function loginFailure(res: Response, error: any) {
  if (error instanceof LoginError) return res.status(error.status).json({ error: error.message });
  if (error?.code === "23505") {
    return res.status(409).json({ error: "This phone or email is already registered. Please check your details and retry." });
  }
  if (error?.code === "22P02" || error?.code === "42704") {
    return res.status(503).json({ error: "PHONE_LOGIN_MIGRATION_REQUIRED" });
  }
  console.error("[phone-login] Login could not be completed");
  return res.status(500).json({ error: "Unable to sign in. Please try again." });
}

export function registerPhoneLoginRoutes(app: Express) {
  app.post("/api/auth/phone-login", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = phoneLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid login details" });
    }
    const { phone, code, profile } = parsed.data;
    const details = profile ? loginProfileValues(profile) : null;
    try {
      const result = await db.transaction(async tx => {
        // Serialize this number's login requests, including concurrent first signups.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`phone-login:${phone}`}))`);
        const [otp] = await tx.select().from(otpRequests).where(and(
          eq(otpRequests.phone, phone), isNull(otpRequests.email),
          eq(otpRequests.purpose, "login"), isNull(otpRequests.consumedAt),
          gt(otpRequests.expiresAt, new Date()),
        )).orderBy(sql`${otpRequests.createdAt} DESC`).limit(1).for("update");
        if (!otp) throw new LoginError(400, "OTP expired or already used. Please request a new code.");
        if ((otp.attemptCount || 0) >= (otp.maxAttempts || 3)) {
          throw new LoginError(400, "Too many attempts. Please request a new code.");
        }
        if (!await verifyPassword(code, otp.codeHash)) {
          // Return, rather than throw, so the attempt increment is committed.
          await tx.update(otpRequests).set({ attemptCount: (otp.attemptCount || 0) + 1 })
            .where(eq(otpRequests.id, otp.id));
          return { error: "Invalid OTP. Please try again." } as const;
        }
        const matches = await tx.select().from(users).where(
          inArray(users.phone, [phone, `91${phone}`, `+91${phone}`]),
        ).for("update");
        if (matches.length > 1) throw new LoginError(409, "More than one account uses this mobile number. Please contact support.");
        let user = matches[0];
        if (user && !user.isActive) throw new LoginError(403, "This account is inactive. Please contact support.");
        if (!user && !details) {
          // Consume OTP once, but do not issue a session or create a placeholder account.
          const registrationToken = createPhoneSignupToken(phone, otp.id);
          const [claimed] = await tx.update(otpRequests).set({ consumedAt: new Date() }).where(and(
            eq(otpRequests.id, otp.id), isNull(otpRequests.consumedAt),
          )).returning({ id: otpRequests.id });
          if (!claimed) throw new LoginError(400, "OTP already used. Please request a new code.");
          return { registrationToken } as const;
        }
        // Optional email never identifies, merges or verifies an account.
        if (details && (!user || !user.profileCompleted)) {
          const emailToSave = !user?.email ? details.email : null;
          if (emailToSave) {
            const [claimed] = await tx.select({ id: users.id }).from(users)
              .where(sql`lower(${users.email}) = ${emailToSave}`).limit(1);
            if (claimed && claimed.id !== user?.id) {
              throw new LoginError(409, "This email is already associated with another account. Leave it blank or use a different email.");
            }
          }
          if (!user) {
            user = await createPhoneAccount(tx, phone, details);
          } else {
            // Fill missing onboarding values without replacing a returning user's identity.
            [user] = await tx.update(users).set({
              firstName: user.firstName || details.firstName,
              lastName: user.firstName ? user.lastName : details.lastName,
              userType: user.userType || details.userType,
              ...(!user.email && details.email ? { email: details.email, emailVerifiedAt: null } : {}),
              ...(details.city && !(user.metadata as Record<string, unknown> | null)?.city
                ? { metadata: { ...(user.metadata as Record<string, unknown> || {}), city: details.city } } : {}),
              phoneVerifiedAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date(),
            }).where(eq(users.id, user.id)).returning();
          }
        } else {
          [user] = await tx.update(users).set({ phoneVerifiedAt: new Date(), lastLoginAt: new Date() })
            .where(eq(users.id, user.id)).returning();
        }
        // Claim atomically; a legacy verification request must not also consume it.
        const [claimed] = await tx.update(otpRequests).set({ consumedAt: new Date() }).where(and(
          eq(otpRequests.id, otp.id), isNull(otpRequests.consumedAt),
        )).returning({ id: otpRequests.id });
        if (!claimed) throw new LoginError(400, "OTP already used. Please request a new code.");
        return { userId: user.id } as const;
      });
      if ("error" in result) return res.status(400).json({ error: result.error });
      if ("registrationToken" in result) return res.json({
        success: true, needsProfile: true, registrationToken: result.registrationToken,
      });
      return await signedIn(res, result.userId);
    } catch (error) { return loginFailure(res, error); }
  });

  app.post("/api/auth/phone-login/complete", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const parsed = phoneSignupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid profile" });
    const proof = readPhoneSignupToken(parsed.data.registrationToken);
    if (!proof) return res.status(410).json({ error: "Phone verification expired. Please request a new OTP." });
    try {
      const userId = await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`phone-login:${proof.phone}`}))`);
        const [otp] = await tx.select().from(otpRequests).where(and(
          eq(otpRequests.id, proof.otpId), eq(otpRequests.phone, proof.phone),
          eq(otpRequests.purpose, "login"), isNotNull(otpRequests.consumedAt), isNull(otpRequests.userId),
        )).limit(1).for("update");
        if (!otp) throw new LoginError(410, "Phone verification expired or already used. Please request a new OTP.");
        const [existing] = await tx.select({ id: users.id }).from(users)
          .where(inArray(users.phone, [proof.phone, `91${proof.phone}`, `+91${proof.phone}`]));
        // A signup proof must not be reusable to sign into an account created elsewhere.
        if (existing) throw new LoginError(410, "This number is now registered. Please sign in with a new OTP.");
        const user = await createPhoneAccount(tx, proof.phone, loginProfileValues(parsed.data.profile));
        await tx.update(otpRequests).set({ userId: user.id }).where(eq(otpRequests.id, otp.id));
        return user.id;
      });
      return await signedIn(res, userId);
    } catch (error) { return loginFailure(res, error); }
  });
}
