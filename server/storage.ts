import {
  users,
  properties,
  propertyImages,
  propertyDocuments,
  enquiries,
  shortlists,
  reports,
  featureFlags,
  listingAuditLogs,
  type User,
  type InsertUser,
  type Property,
  type InsertProperty,
  type Enquiry,
  type InsertEnquiry,
  type Shortlist,
  type InsertShortlist,
  type Report,
  type InsertReport,
  type FeatureFlag,
  type InsertFeatureFlag,
  type PropertyFilters,
  type ListingAuditLog,
  type PropertyDocument,
  type InsertPropertyDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, ilike, sql, desc, asc, ne, isNull, inArray } from "drizzle-orm";

// Extended property type with images array
export interface PropertyWithImages extends Property {
  images?: string[];
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Properties
  getProperties(filters?: PropertyFilters, sortBy?: string): Promise<Property[]>;
  getPropertiesForAdmin(includeDeleted?: boolean): Promise<(Property & { ownerEmail?: string; ownerPhone?: string })[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getFeaturedProperties(limit?: number): Promise<Property[]>;
  getSimilarProperties(city: string, excludeId: string, limit?: number): Promise<Property[]>;
  createProperty(property: InsertProperty & { submissionIp?: string | null; submissionUserAgent?: string | null }): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  // Listings are never hard-deleted (Issue #2) - this marks the listing
  // inactive and records who deleted it, keeping every field intact.
  softDeleteProperty(id: string, deletedBy: string, deletedByRole: "user" | "admin"): Promise<Property | undefined>;
  restoreProperty(id: string): Promise<Property | undefined>;
  countActiveListingsForOwner(ownerId: string): Promise<number>;

  // Listing audit trail (Issue #2 / #4)
  createListingAuditLog(entry: {
    propertyId: string;
    action: "created" | "updated" | "status_changed" | "deleted" | "restored" | "flagged";
    actorId?: string | null;
    actorRole: "user" | "admin" | "system";
    snapshot?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
    notes?: string | null;
  }): Promise<ListingAuditLog>;
  getListingAuditLogs(propertyId: string): Promise<ListingAuditLog[]>;
  getAllListingAuditLogs(limit?: number): Promise<ListingAuditLog[]>;

  // Broker-abuse flagging (Issue #4)
  getFlaggedUsers(): Promise<(User & { activeListingCount: number })[]>;
  flagUser(userId: string, reason: string): Promise<void>;
  clearUserFlag(userId: string): Promise<void>;
  warnUser(userId: string): Promise<void>;

  // Enquiries
  getEnquiries(): Promise<Enquiry[]>;
  getEnquiry(id: string): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiryStatus(id: string, status: string): Promise<Enquiry | undefined>;

  // Shortlists (Saved Properties) - enriched with property details
  getShortlists(userId: string): Promise<(Shortlist & {
    property: {
      id: string;
      title: string;
      rent: string | null;
      bedrooms: number | null;
      bathrooms: string | null;
      squareFeet: number | null;
      furnishing: string | null;
      city: string;
      locality: string;
      status: string;
    };
  })[]>;
  addToShortlist(data: InsertShortlist): Promise<Shortlist>;
  removeFromShortlist(userId: string, propertyId: string): Promise<boolean>;

  // Reports
  getReports(): Promise<Report[]>;
  createReport(data: { propertyId: string; reporterId: string; reason: string; description?: string }): Promise<Report>;
  updateReportStatus(id: string, data: { status?: string; reviewedBy?: string; resolution?: string }): Promise<Report | undefined>;

  // Owner Dashboard
  getOwnerProperties(ownerId: string): Promise<Property[]>;
  getOwnerEnquiries(ownerId: string): Promise<Enquiry[]>;
  getTenantEnquiries(tenantId: string): Promise<(Enquiry & {
    propertyTitle: string;
    ownerName: string;
    ownerPhone: string | null;
  })[]>;

  // Feature Flags
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(name: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag | undefined>;

  // Property Documents (optional supporting docs - never required to list)
  addPropertyDocument(data: InsertPropertyDocument): Promise<PropertyDocument>;
  getPropertyDocuments(propertyId: string): Promise<PropertyDocument[]>;
  deletePropertyDocument(id: string): Promise<PropertyDocument | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  // Properties
  async getProperties(filters?: PropertyFilters, sortBy?: string): Promise<Property[]> {
    let query = db.select().from(properties);
    const conditions = [];

    if (filters) {
      if (filters.listingType) {
        conditions.push(eq(properties.listingType, filters.listingType));
      }
      if (filters.propertyType) {
        conditions.push(eq(properties.propertyType, filters.propertyType as any));
      }
      if (filters.cityId) {
        conditions.push(eq(properties.cityId, filters.cityId));
      }
      // Filter by city name (case-insensitive)
      if (filters.city) {
        conditions.push(ilike(properties.city, filters.city));
      }
      // Filter by locality name - match against address field
      if (filters.locality) {
        conditions.push(ilike(properties.address, `%${filters.locality}%`));
      }
      // Filter by isCommercial
      if (filters.isCommercial !== undefined) {
        conditions.push(eq(properties.isCommercial, filters.isCommercial));
      }
      // Filter by BHK (bedrooms)
      if (filters.bhk && filters.bhk.length > 0) {
        const bhkConditions = filters.bhk.map(bhk => eq(properties.bedrooms, bhk));
        if (bhkConditions.length === 1) {
          conditions.push(bhkConditions[0]);
        } else {
          conditions.push(sql`(${sql.join(bhkConditions, sql` OR `)})`);
        }
      }
      // Filter by furnishing
      if (filters.furnishing) {
        const furnishingList = Array.isArray(filters.furnishing) ? filters.furnishing : [filters.furnishing];
        if (furnishingList.length > 0) {
          const furnishingConditions = furnishingList.map(f => eq(properties.furnishing, f));
          if (furnishingConditions.length === 1) {
            conditions.push(furnishingConditions[0]);
          } else {
            conditions.push(sql`(${sql.join(furnishingConditions, sql` OR `)})`);
          }
        }
      }
      if (filters.minRent) {
        conditions.push(gte(properties.rent, filters.minRent.toString()));
      }
      if (filters.maxRent) {
        conditions.push(lte(properties.rent, filters.maxRent.toString()));
      }
      if (filters.minPrice) {
        conditions.push(gte(properties.price, filters.minPrice.toString()));
      }
      if (filters.maxPrice) {
        conditions.push(lte(properties.price, filters.maxPrice.toString()));
      }
      if (filters.minBedrooms) {
        conditions.push(gte(properties.bedrooms, filters.minBedrooms));
      }
      if (filters.maxBedrooms) {
        conditions.push(lte(properties.bedrooms, filters.maxBedrooms));
      }
      if (filters.minBathrooms) {
        conditions.push(gte(properties.bathrooms, filters.minBathrooms.toString()));
      }
    }

    // Add status = active by default, and always exclude soft-deleted listings
    // (Issue #2: a deleted listing must never reappear on the public site)
    conditions.push(eq(properties.status, "active"));
    conditions.push(isNull(properties.deletedAt));

    let result;
    if (conditions.length > 0) {
      result = await db
        .select()
        .from(properties)
        .where(and(...conditions))
        .orderBy(
          sortBy === "price_asc" ? asc(properties.price) :
          sortBy === "price_desc" ? desc(properties.price) :
          sortBy === "beds-desc" ? desc(properties.bedrooms) :
          desc(properties.createdAt)
        );
    } else {
      result = await db
        .select()
        .from(properties)
        .orderBy(desc(properties.createdAt));
    }

    // Batch fetch all images for the returned properties in a single query
    if (result.length === 0) {
      return [];
    }
    
    const propertyIds = result.map(p => p.id);
    const allImages = await db
      .select()
      .from(propertyImages)
      .where(sql`${propertyImages.propertyId} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(sql`COALESCE(${propertyImages.isPrimary}, false) DESC`, propertyImages.displayOrder);
    
    // Group images by property ID (primary image will be first due to COALESCE ordering)
    const imagesByPropertyId = new Map<string, string[]>();
    for (const img of allImages) {
      const existing = imagesByPropertyId.get(img.propertyId) || [];
      existing.push(img.url);
      imagesByPropertyId.set(img.propertyId, existing);
    }
    
    // Merge images into properties
    const propertiesWithImages = result.map(property => ({
      ...property,
      images: imagesByPropertyId.get(property.id) || [],
    }));

    return propertiesWithImages;
  }

  // Admin listing: returns properties of every status (active, pending, inactive, etc.)
  // along with the owner's email/phone so the admin can review and contact them.
  // By default soft-deleted listings are excluded (they live in their own
  // "Deleted" view - see includeDeleted=true) but are NEVER hard-removed.
  async getPropertiesForAdmin(includeDeleted: boolean = false): Promise<(PropertyWithImages & { ownerEmail?: string; ownerPhone?: string })[]> {
    const baseQuery = db
      .select({
        property: properties,
        ownerEmail: users.email,
        ownerPhone: users.phone,
      })
      .from(properties)
      .leftJoin(users, eq(properties.ownerId, users.id));

    const result = includeDeleted
      ? await baseQuery.orderBy(desc(properties.createdAt))
      : await baseQuery.where(isNull(properties.deletedAt)).orderBy(desc(properties.createdAt));

    if (result.length === 0) {
      return [];
    }

    const propertyIds = result.map(r => r.property.id);
    const allImages = await db
      .select()
      .from(propertyImages)
      .where(sql`${propertyImages.propertyId} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(sql`COALESCE(${propertyImages.isPrimary}, false) DESC`, propertyImages.displayOrder);

    const imagesByPropertyId = new Map<string, string[]>();
    for (const img of allImages) {
      const existing = imagesByPropertyId.get(img.propertyId) || [];
      existing.push(img.url);
      imagesByPropertyId.set(img.propertyId, existing);
    }

    return result.map(({ property, ownerEmail, ownerPhone }) => ({
      ...property,
      images: imagesByPropertyId.get(property.id) || [],
      ownerEmail: ownerEmail || undefined,
      ownerPhone: ownerPhone || undefined,
    }));
  }


  async getProperty(id: string): Promise<PropertyWithImages | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    if (!property) return undefined;
    
    // Fetch associated images - primary image first (COALESCE handles null values), then by display order
    const images = await db
      .select()
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, id))
      .orderBy(sql`COALESCE(${propertyImages.isPrimary}, false) DESC`, propertyImages.displayOrder);
    
    return {
      ...property,
      images: images.map(img => img.url),
    };
  }

  async getFeaturedProperties(limit: number = 8): Promise<Property[]> {
    const result = await db
      .select()
      .from(properties)
      .where(and(eq(properties.isFeatured, true), eq(properties.status, "active")))
      .limit(limit);
    
    if (result.length === 0) {
      return [];
    }
    
    // Batch fetch all images for featured properties - primary image first
    const propertyIds = result.map(p => p.id);
    const allImages = await db
      .select()
      .from(propertyImages)
      .where(sql`${propertyImages.propertyId} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(sql`COALESCE(${propertyImages.isPrimary}, false) DESC`, propertyImages.displayOrder);
    
    // Group images by property ID (primary image will be first due to COALESCE ordering)
    const imagesByPropertyId = new Map<string, string[]>();
    for (const img of allImages) {
      const existing = imagesByPropertyId.get(img.propertyId) || [];
      existing.push(img.url);
      imagesByPropertyId.set(img.propertyId, existing);
    }
    
    // Merge images into properties
    const propertiesWithImages = result.map(property => ({
      ...property,
      images: imagesByPropertyId.get(property.id) || [],
    }));
    
    return propertiesWithImages;
  }

  async getSimilarProperties(cityId: string, excludeId: string, limit: number = 4): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.cityId, cityId),
          ne(properties.id, excludeId),
          eq(properties.status, "active")
        )
      )
      .limit(limit);
  }

  async createProperty(property: InsertProperty & { submissionIp?: string | null; submissionUserAgent?: string | null }): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property as any).returning();
    return newProperty;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated || undefined;
  }

  // Issue #2: never hard-delete a listing. Mark it inactive and record who
  // deleted it and when; every field (title, description, pricing, owner
  // link, etc.) stays exactly as it was, permanently, in this same row.
  async softDeleteProperty(id: string, deletedBy: string, deletedByRole: "user" | "admin"): Promise<Property | undefined> {
    const [updated] = await db
      .update(properties)
      .set({
        status: "inactive",
        deletedAt: new Date(),
        deletedBy,
        deletedByRole,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();
    return updated || undefined;
  }

  async restoreProperty(id: string): Promise<Property | undefined> {
    const [updated] = await db
      .update(properties)
      .set({
        status: "active",
        deletedAt: null,
        deletedBy: null,
        deletedByRole: null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();
    return updated || undefined;
  }

  // Issue #4: how many currently-live listings does this owner have right
  // now - used to enforce the 2-active-listing cap per verified phone number.
  async countActiveListingsForOwner(ownerId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(
        and(
          eq(properties.ownerId, ownerId),
          isNull(properties.deletedAt),
          sql`${properties.status} IN ('active', 'pending')`
        )
      );
    return count || 0;
  }

  // Listing audit trail (Issue #2 / #4) - permanent, never trimmed or deleted
  async createListingAuditLog(entry: {
    propertyId: string;
    action: "created" | "updated" | "status_changed" | "deleted" | "restored" | "flagged";
    actorId?: string | null;
    actorRole: "user" | "admin" | "system";
    snapshot?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
    notes?: string | null;
  }): Promise<ListingAuditLog> {
    const [log] = await db.insert(listingAuditLogs).values({
      propertyId: entry.propertyId,
      action: entry.action as any,
      actorId: entry.actorId || null,
      actorRole: entry.actorRole as any,
      snapshot: entry.snapshot ?? null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      notes: entry.notes || null,
    }).returning();
    return log;
  }

  async getListingAuditLogs(propertyId: string): Promise<ListingAuditLog[]> {
    return await db
      .select()
      .from(listingAuditLogs)
      .where(eq(listingAuditLogs.propertyId, propertyId))
      .orderBy(desc(listingAuditLogs.createdAt));
  }

  async getAllListingAuditLogs(limit: number = 200): Promise<ListingAuditLog[]> {
    return await db
      .select()
      .from(listingAuditLogs)
      .orderBy(desc(listingAuditLogs.createdAt))
      .limit(limit);
  }

  // Broker-abuse flagging (Issue #4)
  async getFlaggedUsers(): Promise<(User & { activeListingCount: number })[]> {
    const flaggedUsers = await db.select().from(users).where(eq(users.isFlagged, true));
    if (flaggedUsers.length === 0) return [];

    const counts = await db
      .select({
        ownerId: properties.ownerId,
        count: sql<number>`count(*)::int`,
      })
      .from(properties)
      .where(
        and(
          isNull(properties.deletedAt),
          sql`${properties.status} IN ('active', 'pending')`,
          inArray(properties.ownerId, flaggedUsers.map(u => u.id))
        )
      )
      .groupBy(properties.ownerId);

    const countByOwner = new Map(counts.map(c => [c.ownerId, c.count]));
    return flaggedUsers.map(u => ({ ...u, activeListingCount: countByOwner.get(u.id) || 0 }));
  }

  async flagUser(userId: string, reason: string): Promise<void> {
    await db.update(users)
      .set({ isFlagged: true, flaggedAt: new Date(), flagReason: reason })
      .where(eq(users.id, userId));
  }

  async clearUserFlag(userId: string): Promise<void> {
    await db.update(users)
      .set({ isFlagged: false, flaggedAt: null, flagReason: null })
      .where(eq(users.id, userId));
  }

  async warnUser(userId: string): Promise<void> {
    await db.update(users)
      .set({ warnedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Enquiries
  async getEnquiries(): Promise<Enquiry[]> {
    return await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
  }

  async getEnquiry(id: string): Promise<Enquiry | undefined> {
    const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, id));
    return enquiry || undefined;
  }

  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    const [newEnquiry] = await db.insert(enquiries).values(enquiry).returning();
    return newEnquiry;
  }

  async updateEnquiryStatus(id: string, status: string): Promise<Enquiry | undefined> {
    const [updated] = await db
      .update(enquiries)
      .set({ status })
      .where(eq(enquiries.id, id))
      .returning();
    return updated || undefined;
  }

  // Shortlists - enriched with the property's core details so the tenant
  // dashboard can render a real card without a second round-trip per item.
  async getShortlists(userId: string): Promise<(Shortlist & {
    property: {
      id: string;
      title: string;
      rent: string | null;
      bedrooms: number | null;
      bathrooms: string | null;
      squareFeet: number | null;
      furnishing: string | null;
      city: string;
      locality: string;
      status: string;
    };
  })[]> {
    const rows = await db
      .select({
        shortlist: shortlists,
        property: properties,
      })
      .from(shortlists)
      .innerJoin(properties, eq(shortlists.propertyId, properties.id))
      .where(eq(shortlists.userId, userId))
      .orderBy(desc(shortlists.createdAt));

    return rows.map(({ shortlist, property }) => ({
      ...shortlist,
      property: {
        id: property.id,
        title: property.title,
        rent: property.rent,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        furnishing: property.furnishing,
        city: property.city,
        locality: property.address?.split(",")[0]?.trim() || property.city,
        status: property.status,
      },
    }));
  }

  async addToShortlist(data: InsertShortlist): Promise<Shortlist> {
    const [saved] = await db.insert(shortlists).values(data).returning();
    return saved;
  }

  async removeFromShortlist(userId: string, propertyId: string): Promise<boolean> {
    const result = await db
      .delete(shortlists)
      .where(
        and(
          eq(shortlists.userId, userId),
          eq(shortlists.propertyId, propertyId)
        )
      )
      .returning();
    return result.length > 0;
  }

  // Feature Flags
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags);
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag || undefined;
  }

  async createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [newFlag] = await db.insert(featureFlags).values(flag).returning();
    return newFlag;
  }

  async updateFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag | undefined> {
    const [updated] = await db
      .update(featureFlags)
      .set({ enabled })
      .where(eq(featureFlags.id, id))
      .returning();
    return updated || undefined;
  }

  // Reports
  async getReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async createReport(data: { propertyId: string; reporterId: string; reason: string; description?: string }): Promise<Report> {
    const [report] = await db.insert(reports).values({
      propertyId: data.propertyId,
      reporterId: data.reporterId,
      reason: data.reason as any,
      description: data.description,
    }).returning();
    return report;
  }

  async updateReportStatus(id: string, data: { status?: string; reviewedBy?: string; resolution?: string }): Promise<Report | undefined> {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.reviewedBy) {
      updateData.reviewedBy = data.reviewedBy;
      updateData.reviewedAt = new Date();
    }
    if (data.resolution) updateData.resolution = data.resolution;

    const [updated] = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, id))
      .returning();
    return updated || undefined;
  }

  // Owner Dashboard
  async getOwnerProperties(ownerId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, ownerId))
      .orderBy(desc(properties.createdAt));
  }

  async getOwnerEnquiries(ownerId: string): Promise<Enquiry[]> {
    const ownerProperties = await this.getOwnerProperties(ownerId);
    const propertyIds = ownerProperties.map(p => p.id);
    if (propertyIds.length === 0) return [];

    return await db
      .select()
      .from(enquiries)
      .where(inArray(enquiries.propertyId, propertyIds))
      .orderBy(desc(enquiries.createdAt));
  }

  // Enriched with property title + owner contact so the tenant dashboard
  // can show real enquiry history instead of the previous hardcoded mocks.
  async getTenantEnquiries(tenantId: string): Promise<(Enquiry & {
    propertyTitle: string;
    ownerName: string;
    ownerPhone: string | null;
  })[]> {
    const rows = await db
      .select({
        enquiry: enquiries,
        propertyTitle: properties.title,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerPhone: users.phone,
      })
      .from(enquiries)
      .leftJoin(properties, eq(enquiries.propertyId, properties.id))
      .leftJoin(users, eq(properties.ownerId, users.id))
      .where(eq(enquiries.userId, tenantId))
      .orderBy(desc(enquiries.createdAt));

    return rows.map(({ enquiry, propertyTitle, ownerFirstName, ownerLastName, ownerPhone }) => ({
      ...enquiry,
      propertyTitle: propertyTitle || "Property",
      ownerName: [ownerFirstName, ownerLastName].filter(Boolean).join(" ") || "Property Owner",
      ownerPhone,
    }));
  }

  // Property Documents (optional supporting docs - never required to list)
  async addPropertyDocument(data: InsertPropertyDocument): Promise<PropertyDocument> {
    const [doc] = await db.insert(propertyDocuments).values(data).returning();
    return doc;
  }

  async getPropertyDocuments(propertyId: string): Promise<PropertyDocument[]> {
    return await db
      .select()
      .from(propertyDocuments)
      .where(eq(propertyDocuments.propertyId, propertyId))
      .orderBy(desc(propertyDocuments.createdAt));
  }

  async deletePropertyDocument(id: string): Promise<PropertyDocument | undefined> {
    const [deleted] = await db.delete(propertyDocuments).where(eq(propertyDocuments.id, id)).returning();
    return deleted || undefined;
  }

  // Initialize default feature flags
  async initializeFeatureFlags(): Promise<void> {
    const sellPropertyFlag = await this.getFeatureFlag("sell_property");
    if (!sellPropertyFlag) {
      await this.createFeatureFlag({
        name: "sell_property",
        enabled: false,
        description: "Enable the ability to list properties for sale",
      });
    }
  }
}

export const storage = new DatabaseStorage();
