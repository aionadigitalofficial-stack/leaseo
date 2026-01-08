import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for property types and listing types
export const propertyTypeEnum = pgEnum("property_type", [
  "house",
  "apartment",
  "condo",
  "townhouse",
  "studio",
  "villa"
]);

// Listing type - provision for future "sell" functionality
export const listingTypeEnum = pgEnum("listing_type", [
  "rent",
  "sale"
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "pending",
  "rented",
  "sold",
  "inactive"
]);

// User roles - explicit roles without broker/agent
export const userRoleEnum = pgEnum("user_role", [
  "residential_owner",
  "commercial_owner", 
  "residential_tenant",
  "commercial_tenant",
  "admin"
]);

// OTP purpose enum
export const otpPurposeEnum = pgEnum("otp_purpose", [
  "login",
  "verify_phone",
  "verify_email",
  "password_reset"
]);

// Users table - extended for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Authentication fields
  phone: text("phone").unique(),
  countryCode: text("country_code").default("+91"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at"),
  passwordHash: text("password_hash"),
  
  // Profile fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  
  // Role management - user can have multiple roles they switch between
  activeRole: userRoleEnum("active_role").default("residential_tenant"),
  availableRoles: text("available_roles").array().default(sql`ARRAY['residential_tenant']::text[]`),
  
  // Status flags
  isActive: boolean("is_active").default(true),
  profileCompleted: boolean("profile_completed").default(false),
  
  // Metadata
  metadata: jsonb("metadata"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("users_phone_idx").on(table.phone),
  index("users_email_idx").on(table.email),
]);

// OTP requests table for rate limiting and verification
export const otpRequests = pgTable("otp_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  phone: text("phone"),
  email: text("email"),
  countryCode: text("country_code").default("+91"),
  codeHash: text("code_hash").notNull(),
  purpose: otpPurposeEnum("purpose").notNull().default("login"),
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(3),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("otp_phone_idx").on(table.phone),
  index("otp_email_idx").on(table.email),
  index("otp_expires_idx").on(table.expiresAt),
]);

// Refresh tokens for JWT session management
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => [
  index("refresh_user_idx").on(table.userId),
  index("refresh_token_idx").on(table.tokenHash),
]);

// Login attempts for rate limiting and abuse protection
export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  identifierType: text("identifier_type").notNull(),
  ipAddress: text("ip_address"),
  success: boolean("success").default(false),
  failureReason: text("failure_reason"),
  occurredAt: timestamp("occurred_at").defaultNow(),
}, (table) => [
  index("login_identifier_idx").on(table.identifier),
  index("login_ip_idx").on(table.ipAddress),
  index("login_occurred_idx").on(table.occurredAt),
]);

// Properties/Listings table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull().default("apartment"),
  listingType: listingTypeEnum("listing_type").notNull().default("rent"),
  status: listingStatusEnum("status").notNull().default("active"),
  
  // Pricing
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  priceUnit: text("price_unit").default("month"),
  
  // Location
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code"),
  country: text("country").default("India"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Property details
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull().default("1"),
  squareFeet: integer("square_feet"),
  yearBuilt: integer("year_built"),
  
  // Images
  images: text("images").array().default(sql`ARRAY[]::text[]`),
  
  // Amenities
  amenities: text("amenities").array().default(sql`ARRAY[]::text[]`),
  
  // Features
  isFeatured: boolean("is_featured").default(false),
  isCommercial: boolean("is_commercial").default(false),
  
  // Owner reference
  ownerId: varchar("owner_id").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved/Favorite properties
export const savedProperties = pgTable("saved_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feature flags table
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  savedProperties: many(savedProperties),
  refreshTokens: many(refreshTokens),
  otpRequests: many(otpRequests),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  inquiries: many(inquiries),
  savedBy: many(savedProperties),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [inquiries.userId],
    references: [users.id],
  }),
}));

export const savedPropertiesRelations = relations(savedProperties, ({ one }) => ({
  user: one(users, {
    fields: [savedProperties.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [savedProperties.propertyId],
    references: [properties.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const otpRequestsRelations = relations(otpRequests, ({ one }) => ({
  user: one(users, {
    fields: [otpRequests.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertSavedPropertySchema = createInsertSchema(savedProperties).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
});

export const insertOtpRequestSchema = createInsertSchema(otpRequests).omit({
  id: true,
  createdAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  issuedAt: true,
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  occurredAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

export type InsertSavedProperty = z.infer<typeof insertSavedPropertySchema>;
export type SavedProperty = typeof savedProperties.$inferSelect;

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

export type InsertOtpRequest = z.infer<typeof insertOtpRequestSchema>;
export type OtpRequest = typeof otpRequests.$inferSelect;

export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;

export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;

// Role type
export type UserRole = "residential_owner" | "commercial_owner" | "residential_tenant" | "commercial_tenant" | "admin";

// Search/Filter types
export interface PropertyFilters {
  listingType?: "rent" | "sale";
  propertyType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  amenities?: string[];
  isCommercial?: boolean;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  profileCompleted: boolean;
  iat?: number;
  exp?: number;
}
