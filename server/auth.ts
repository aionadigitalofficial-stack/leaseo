import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, roles, userRoles } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set");
  }
  return secret;
}
const JWT_EXPIRY = "7d";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  activeRoleId: string | null;
  activeRoleName: string | null;
  isAdmin: boolean;
  // Issue #3: the frontend needs these to gate "post a listing" behind a
  // completed, verified profile.
  profileCompleted: boolean;
  userType: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  // Issue #4: surfaced so a flagged user can be warned in their dashboard.
  isFlagged: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const userRolesList = await db
    .select({ roleId: userRoles.roleId, userRoleId: userRoles.id })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const adminRole = await db.select().from(roles).where(eq(roles.name, "admin"));
  const adminRoleId = adminRole[0]?.id;
  const isAdmin = userRolesList.some((r) => r.roleId === adminRoleId);

  // Get the active role name. users.active_role_id has a foreign key to
  // roles.id (see shared/schema.ts) and every place that sets it
  // (registration, OTP signup) stores a roles.id directly - so it's
  // resolved directly here.
  //
  // BUG FIX: this used to search userRolesList (the user_roles join table)
  // for a row whose OWN id matched user.activeRoleId, based on a comment
  // claiming activeRoleId "references user_roles.id" - it doesn't; that
  // was never true against either the schema or any of the write sites.
  // Since userRoles.id and roles.id are different UUID spaces, that lookup
  // essentially never matched, so activeRoleName came back null for almost
  // every real user - silently breaking owner-vs-tenant dashboard routing,
  // since the frontend falls back to treating anyone with a null role as a
  // tenant regardless of their actual assigned role.
  let activeRoleName: string | null = null;
  if (user.activeRoleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, user.activeRoleId));
    activeRoleName = role?.name || null;
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    activeRoleId: user.activeRoleId,
    activeRoleName,
    isAdmin,
    profileCompleted: !!user.profileCompleted,
    userType: user.userType,
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    isFlagged: !!user.isFlagged,
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  getAuthUser(payload.userId).then((user) => {
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  }).catch(() => {
    res.status(500).json({ error: "Auth error" });
  });
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (payload) {
    getAuthUser(payload.userId).then((user) => {
      req.user = user || undefined;
      next();
    }).catch(() => {
      next();
    });
  } else {
    next();
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Base roles the platform depends on by name (admin checks, owner/tenant
// role assignment during OTP signup, etc.). Previously NOTHING in the
// codebase created these rows - only individual features lazily created
// "residential_tenant" on first registration. In particular, the "admin"
// role was never created anywhere, which meant seedAdminUser() below could
// never actually find it to assign to the admin account: a fresh deployment
// would seed an admin@leaseo.in login that could authenticate but would
// fail every isAdmin check and be permanently locked out of the admin panel,
// with no way to grant itself (or anyone) the admin role since doing so
// requires the admin panel itself.
const BASE_ROLES: { name: string; displayName: string; description: string }[] = [
  { name: "admin", displayName: "Administrator", description: "Full platform access" },
  { name: "residential_owner", displayName: "Residential Owner", description: "Lists residential property for rent or sale" },
  { name: "residential_tenant", displayName: "Residential Tenant", description: "Looking for residential property" },
  { name: "commercial_owner", displayName: "Commercial Owner", description: "Lists commercial property for rent or sale" },
  { name: "commercial_tenant", displayName: "Commercial Tenant", description: "Looking for commercial property" },
];

export async function seedRoles(): Promise<void> {
  for (const role of BASE_ROLES) {
    const [existing] = await db.select().from(roles).where(eq(roles.name, role.name));
    if (!existing) {
      await db.insert(roles).values({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isActive: true,
      });
      console.log(`Seeded role: ${role.name}`);
    }
  }
}

export async function seedAdminUser() {
  const adminEmail = "admin@leaseo.in";
  const adminPassword = "Admin@123";

  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin"));

  const [existingAdmin] = await db.select().from(users).where(eq(users.email, adminEmail));

  if (existingAdmin) {
    // Self-heal: earlier versions of this app could create this account
    // without ever assigning it the admin role (see seedRoles() above) -
    // if that happened, fix it now instead of leaving the account locked
    // out of the admin panel forever.
    if (adminRole) {
      const [existingAssignment] = await db.select().from(userRoles).where(
        and(eq(userRoles.userId, existingAdmin.id), eq(userRoles.roleId, adminRole.id))
      );
      if (!existingAssignment) {
        await db.insert(userRoles).values({ userId: existingAdmin.id, roleId: adminRole.id }).onConflictDoNothing();
        console.log("Admin role assigned to previously-existing account:", adminEmail);
      }
    }
    console.log("Admin user already exists:", adminEmail);
    return { email: adminEmail, password: adminPassword, exists: true };
  }

  // Create admin user if it doesn't exist
  const hashedPassword = await hashPassword(adminPassword);
  const [newAdmin] = await db.insert(users).values({
    email: adminEmail,
    passwordHash: hashedPassword,
    firstName: "Super",
    lastName: "Admin",
    isActive: true,
    profileCompleted: true
  }).returning();
  
  // Assign admin role
  if (adminRole) {
    await db.insert(userRoles).values({
      userId: newAdmin.id,
      roleId: adminRole.id
    });
    console.log("Admin role assigned to:", adminEmail);
  } else {
    console.error("WARNING: 'admin' role not found when creating admin user - seedRoles() should run before seedAdminUser().");
  }
  
  console.log("Admin user created:", adminEmail);
  return { email: adminEmail, password: adminPassword, exists: false, created: true };
}

export async function seedTestUsers() {
  const testUsers = [
    {
      email: "owner@leaseo.in",
      password: "Owner@123",
      firstName: "Test",
      lastName: "Owner",
      roleName: "residential_owner"
    },
    {
      email: "tenant@leaseo.in", 
      password: "Tenant@123",
      firstName: "Test",
      lastName: "Tenant",
      roleName: "residential_tenant"
    }
  ];

  for (const testUser of testUsers) {
    const [existing] = await db.select().from(users).where(eq(users.email, testUser.email));
    
    if (existing) {
      console.log(`Test user already exists: ${testUser.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    const [newUser] = await db.insert(users).values({
      email: testUser.email,
      passwordHash: hashedPassword,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      isActive: true,
      emailVerifiedAt: new Date(),
    }).returning();

    const [role] = await db.select().from(roles).where(eq(roles.name, testUser.roleName));
    
    if (role && newUser) {
      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: role.id,
      });
      console.log(`Created test user: ${testUser.email} with role: ${testUser.roleName}`);
    }
  }

  return testUsers.map(u => ({ email: u.email, password: u.password }));
}
