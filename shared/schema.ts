import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS ====================

export const propertyTypeEnum = pgEnum("property_type", [
  "house",
  "apartment",
  "condo",
  "townhouse",
  "studio",
  "villa",
  "office",
  "shop",
  "warehouse",
  "land"
]);

export const listingTypeEnum = pgEnum("listing_type", [
  "rent",
  "sale"
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "pending",
  "rented",
  "sold",
  "inactive",
  "expired"
]);

export const userRoleEnum = pgEnum("user_role", [
  "residential_owner",
  "commercial_owner",
  "residential_tenant",
  "commercial_tenant",
  "admin"
]);

export const otpPurposeEnum = pgEnum("otp_purpose", [
  "login",
  "verify_phone",
  "verify_email",
  "password_reset"
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "fake_listing",
  "incorrect_info",
  "already_rented",
  "scam",
  "inappropriate_content",
  "other"
]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "resolved",
  "dismissed"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded"
]);

export const boostTypeEnum = pgEnum("boost_type", [
  "featured",
  "premium",
  "spotlight",
  "urgent"
]);

// ==================== ROLES TABLE ====================

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== USERS TABLE ====================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Authentication
  phone: text("phone").unique(),
  countryCode: text("country_code").default("+91"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at"),
  passwordHash: text("password_hash"),
  
  // Profile
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  
  // Active role (for role switching)
  activeRoleId: varchar("active_role_id").references(() => roles.id),
  
  // Status
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

// ==================== USER ROLES (JOIN TABLE) ====================

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => roles.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id),
}, (table) => [
  uniqueIndex("user_role_unique").on(table.userId, table.roleId),
]);

// ==================== CITIES TABLE ====================

export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  state: text("state").notNull(),
  country: text("country").default("India"),
  isActive: boolean("is_active").default(true),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("cities_name_idx").on(table.name),
  uniqueIndex("cities_name_state_unique").on(table.name, table.state),
]);

// ==================== LOCALITIES TABLE ====================

export const localities = pgTable("localities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cityId: varchar("city_id").references(() => cities.id).notNull(),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("localities_city_idx").on(table.cityId),
  index("localities_name_idx").on(table.name),
]);

// ==================== PROPERTIES TABLE ====================

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull().default("apartment"),
  listingType: listingTypeEnum("listing_type").notNull().default("rent"),
  status: listingStatusEnum("status").notNull().default("active"),
  
  // Residential vs Commercial flag
  isCommercial: boolean("is_commercial").default(false),
  
  // Pricing
  rent: decimal("rent", { precision: 12, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 14, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }),
  maintenanceCharges: decimal("maintenance_charges", { precision: 10, scale: 2 }),
  priceUnit: text("price_unit").default("month"),
  
  // Location - linked to cities/localities
  address: text("address").notNull(),
  cityId: varchar("city_id").references(() => cities.id),
  localityId: varchar("locality_id").references(() => localities.id),
  pincode: text("pincode"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Property details
  bedrooms: integer("bedrooms").default(0),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default("0"),
  balconies: integer("balconies").default(0),
  squareFeet: integer("square_feet"),
  carpetArea: integer("carpet_area"),
  floorNumber: integer("floor_number"),
  totalFloors: integer("total_floors"),
  yearBuilt: integer("year_built"),
  furnishing: text("furnishing").default("unfurnished"),
  facing: text("facing"),
  
  // Amenities
  amenities: text("amenities").array().default(sql`ARRAY[]::text[]`),
  
  // Features
  isFeatured: boolean("is_featured").default(false),
  isPremium: boolean("is_premium").default(false),
  viewCount: integer("view_count").default(0),
  
  // Owner reference
  ownerId: varchar("owner_id").references(() => users.id),
  
  // Timestamps
  availableFrom: timestamp("available_from"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("properties_city_idx").on(table.cityId),
  index("properties_locality_idx").on(table.localityId),
  index("properties_rent_idx").on(table.rent),
  index("properties_type_idx").on(table.propertyType),
  index("properties_commercial_idx").on(table.isCommercial),
  index("properties_status_idx").on(table.status),
  index("properties_owner_idx").on(table.ownerId),
]);

// ==================== PROPERTY IMAGES TABLE ====================

export const propertyImages = pgTable("property_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").default(0),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("property_images_property_idx").on(table.propertyId),
]);

// ==================== ENQUIRIES TABLE ====================

export const enquiries = pgTable("enquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").default("new"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("enquiries_property_idx").on(table.propertyId),
  index("enquiries_user_idx").on(table.userId),
]);

// ==================== SHORTLISTS TABLE ====================

export const shortlists = pgTable("shortlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("shortlist_unique").on(table.userId, table.propertyId),
  index("shortlists_user_idx").on(table.userId),
  index("shortlists_property_idx").on(table.propertyId),
]);

// ==================== REPORTS TABLE ====================

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reports_property_idx").on(table.propertyId),
  index("reports_reporter_idx").on(table.reporterId),
  index("reports_status_idx").on(table.status),
]);

// ==================== PAYMENTS TABLE (OPTIONAL) ====================

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id),
  boostId: varchar("boost_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("INR"),
  status: paymentStatusEnum("status").default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payments_user_idx").on(table.userId),
  index("payments_property_idx").on(table.propertyId),
  index("payments_status_idx").on(table.status),
]);

// ==================== LISTING BOOSTS TABLE ====================

export const listingBoosts = pgTable("listing_boosts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  boostType: boostTypeEnum("boost_type").notNull(),
  paymentId: varchar("payment_id").references(() => payments.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("boosts_property_idx").on(table.propertyId),
  index("boosts_user_idx").on(table.userId),
  index("boosts_active_idx").on(table.isActive),
  index("boosts_dates_idx").on(table.startDate, table.endDate),
]);

// ==================== AUTH TABLES ====================

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

// ==================== FEATURE FLAGS ====================

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
});

// ==================== BLOG POSTS ====================

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "draft",
  "published",
  "archived"
]);

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  authorId: varchar("author_id").references(() => users.id),
  status: blogPostStatusEnum("status").default("draft"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("blog_slug_idx").on(table.slug),
  index("blog_status_idx").on(table.status),
  index("blog_published_idx").on(table.publishedAt),
]);

// ==================== PAGE CONTENT (CMS) ====================

export const pageContents = pgTable("page_contents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageKey: text("page_key").notNull().unique(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== RELATIONS ====================

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  activeRole: one(roles, {
    fields: [users.activeRoleId],
    references: [roles.id],
  }),
  userRoles: many(userRoles),
  properties: many(properties),
  shortlists: many(shortlists),
  enquiries: many(enquiries),
  reports: many(reports),
  payments: many(payments),
  listingBoosts: many(listingBoosts),
  refreshTokens: many(refreshTokens),
  otpRequests: many(otpRequests),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const citiesRelations = relations(cities, ({ many }) => ({
  localities: many(localities),
  properties: many(properties),
}));

export const localitiesRelations = relations(localities, ({ one, many }) => ({
  city: one(cities, {
    fields: [localities.cityId],
    references: [cities.id],
  }),
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [properties.cityId],
    references: [cities.id],
  }),
  locality: one(localities, {
    fields: [properties.localityId],
    references: [localities.id],
  }),
  images: many(propertyImages),
  enquiries: many(enquiries),
  shortlistedBy: many(shortlists),
  reports: many(reports),
  boosts: many(listingBoosts),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, {
    fields: [propertyImages.propertyId],
    references: [properties.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  property: one(properties, {
    fields: [enquiries.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [enquiries.userId],
    references: [users.id],
  }),
}));

export const shortlistsRelations = relations(shortlists, ({ one }) => ({
  user: one(users, {
    fields: [shortlists.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [shortlists.propertyId],
    references: [properties.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  property: one(properties, {
    fields: [reports.propertyId],
    references: [properties.id],
  }),
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [reports.reviewedBy],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [payments.propertyId],
    references: [properties.id],
  }),
}));

export const listingBoostsRelations = relations(listingBoosts, ({ one }) => ({
  property: one(properties, {
    fields: [listingBoosts.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [listingBoosts.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [listingBoosts.paymentId],
    references: [payments.id],
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

// ==================== INSERT SCHEMAS ====================

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
  createdAt: true,
});

export const insertLocalitySchema = createInsertSchema(localities).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export const insertPropertyImageSchema = createInsertSchema(propertyImages).omit({
  id: true,
  createdAt: true,
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertShortlistSchema = createInsertSchema(shortlists).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertListingBoostSchema = createInsertSchema(listingBoosts).omit({
  id: true,
  createdAt: true,
  impressions: true,
  clicks: true,
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

// ==================== TYPES ====================

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

export type InsertLocality = z.infer<typeof insertLocalitySchema>;
export type Locality = typeof localities.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertPropertyImage = z.infer<typeof insertPropertyImageSchema>;
export type PropertyImage = typeof propertyImages.$inferSelect;

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

export type InsertShortlist = z.infer<typeof insertShortlistSchema>;
export type Shortlist = typeof shortlists.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertListingBoost = z.infer<typeof insertListingBoostSchema>;
export type ListingBoost = typeof listingBoosts.$inferSelect;

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPageContentSchema = createInsertSchema(pageContents).omit({
  id: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertPageContent = z.infer<typeof insertPageContentSchema>;
export type PageContent = typeof pageContents.$inferSelect;

export type InsertOtpRequest = z.infer<typeof insertOtpRequestSchema>;
export type OtpRequest = typeof otpRequests.$inferSelect;

export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;

export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;

// ==================== ROLE TYPE ====================

export type UserRoleType = "residential_owner" | "commercial_owner" | "residential_tenant" | "commercial_tenant" | "admin";

// ==================== FILTER TYPES ====================

export interface PropertyFilters {
  listingType?: "rent" | "sale";
  propertyType?: string;
  cityId?: string;
  localityId?: string;
  minRent?: number;
  maxRent?: number;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  amenities?: string[];
  isCommercial?: boolean;
  furnishing?: string;
}

// ==================== AUTH TYPES ====================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  profileCompleted: boolean;
  iat?: number;
  exp?: number;
}
