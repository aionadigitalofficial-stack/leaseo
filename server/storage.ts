import {
  users,
  properties,
  enquiries,
  shortlists,
  reports,
  featureFlags,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, ilike, sql, desc, asc, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Properties
  getProperties(filters?: PropertyFilters, sortBy?: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getFeaturedProperties(limit?: number): Promise<Property[]>;
  getSimilarProperties(city: string, excludeId: string, limit?: number): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;

  // Enquiries
  getEnquiries(): Promise<Enquiry[]>;
  getEnquiry(id: string): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiryStatus(id: string, status: string): Promise<Enquiry | undefined>;

  // Shortlists (Saved Properties)
  getShortlists(userId: string): Promise<Shortlist[]>;
  addToShortlist(data: InsertShortlist): Promise<Shortlist>;
  removeFromShortlist(userId: string, propertyId: string): Promise<boolean>;

  // Reports
  getReports(): Promise<Report[]>;
  createReport(data: { propertyId: string; reporterId: string; reason: string; description?: string }): Promise<Report>;
  updateReportStatus(id: string, data: { status?: string; reviewedBy?: string; resolution?: string }): Promise<Report | undefined>;

  // Owner Dashboard
  getOwnerProperties(ownerId: string): Promise<Property[]>;
  getOwnerEnquiries(ownerId: string): Promise<Enquiry[]>;
  getTenantEnquiries(tenantId: string): Promise<Enquiry[]>;

  // Feature Flags
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(name: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag | undefined>;
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

    // Add status = active by default
    conditions.push(eq(properties.status, "active"));

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

    return result;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getFeaturedProperties(limit: number = 8): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(and(eq(properties.isFeatured, true), eq(properties.status, "active")))
      .limit(limit);
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

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
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

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id)).returning();
    return result.length > 0;
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

  // Shortlists
  async getShortlists(userId: string): Promise<Shortlist[]> {
    return await db
      .select()
      .from(shortlists)
      .where(eq(shortlists.userId, userId));
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

    const allEnquiries = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
    return allEnquiries.filter(e => propertyIds.includes(e.propertyId));
  }

  async getTenantEnquiries(tenantId: string): Promise<Enquiry[]> {
    return await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.userId, tenantId))
      .orderBy(desc(enquiries.createdAt));
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
