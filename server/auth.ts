import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, roles, userRoles } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  isAdmin: boolean;
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
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const adminRole = await db.select().from(roles).where(eq(roles.name, "admin"));
  const adminRoleId = adminRole[0]?.id;
  const isAdmin = userRolesList.some((r) => r.roleId === adminRoleId);

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    activeRoleId: user.activeRoleId,
    isAdmin,
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

export async function seedAdminUser() {
  const adminEmail = "admin@leaseo.in";
  const adminPassword = "Leaseo@2024";

  const [existingAdmin] = await db.select().from(users).where(eq(users.email, adminEmail));
  
  if (existingAdmin) {
    console.log("Admin user already exists:", adminEmail);
    return { email: adminEmail, password: adminPassword, exists: true };
  }

  console.log("Admin user needs to be created via database seed.");
  console.log("Expected credentials - Email:", adminEmail, "Password:", adminPassword);
  
  return { email: adminEmail, password: adminPassword, exists: false };
}
