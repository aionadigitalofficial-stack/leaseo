import {
  users,
  properties,
  inquiries,
  savedProperties,
  featureFlags,
  type User,
  type InsertUser,
  type Property,
  type InsertProperty,
  type Inquiry,
  type InsertInquiry,
  type SavedProperty,
  type InsertSavedProperty,
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

  // Inquiries
  getInquiries(): Promise<Inquiry[]>;
  getInquiry(id: string): Promise<Inquiry | undefined>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiryStatus(id: string, status: string): Promise<Inquiry | undefined>;

  // Saved Properties
  getSavedProperties(userId: string): Promise<SavedProperty[]>;
  saveProperty(data: InsertSavedProperty): Promise<SavedProperty>;
  unsaveProperty(userId: string, propertyId: string): Promise<boolean>;

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
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
      if (filters.city) {
        conditions.push(ilike(properties.city, `%${filters.city}%`));
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
          sortBy === "price-asc" ? asc(properties.price) :
          sortBy === "price-desc" ? desc(properties.price) :
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

  async getSimilarProperties(city: string, excludeId: string, limit: number = 4): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(
        and(
          ilike(properties.city, `%${city}%`),
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

  // Inquiries
  async getInquiries(): Promise<Inquiry[]> {
    return await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  }

  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inquiry || undefined;
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }

  async updateInquiryStatus(id: string, status: string): Promise<Inquiry | undefined> {
    const [updated] = await db
      .update(inquiries)
      .set({ status })
      .where(eq(inquiries.id, id))
      .returning();
    return updated || undefined;
  }

  // Saved Properties
  async getSavedProperties(userId: string): Promise<SavedProperty[]> {
    return await db
      .select()
      .from(savedProperties)
      .where(eq(savedProperties.userId, userId));
  }

  async saveProperty(data: InsertSavedProperty): Promise<SavedProperty> {
    const [saved] = await db.insert(savedProperties).values(data).returning();
    return saved;
  }

  async unsaveProperty(userId: string, propertyId: string): Promise<boolean> {
    const result = await db
      .delete(savedProperties)
      .where(
        and(
          eq(savedProperties.userId, userId),
          eq(savedProperties.propertyId, propertyId)
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
