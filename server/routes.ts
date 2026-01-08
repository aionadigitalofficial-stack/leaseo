import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertEnquirySchema } from "@shared/schema";
import type { PropertyFilters } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize feature flags on startup
  await (storage as any).initializeFeatureFlags?.();

  // ==================== PROPERTIES ====================

  // Get all properties with optional filters
  app.get("/api/properties", async (req, res) => {
    try {
      const filters: PropertyFilters = {};
      
      if (req.query.listingType) {
        filters.listingType = req.query.listingType as "rent" | "sale";
      }
      if (req.query.propertyType) {
        filters.propertyType = req.query.propertyType as string;
      }
      if (req.query.city) {
        filters.city = req.query.city as string;
      }
      if (req.query.minPrice) {
        filters.minPrice = parseInt(req.query.minPrice as string);
      }
      if (req.query.maxPrice) {
        filters.maxPrice = parseInt(req.query.maxPrice as string);
      }
      if (req.query.minBedrooms) {
        filters.minBedrooms = parseInt(req.query.minBedrooms as string);
      }
      if (req.query.minBathrooms) {
        filters.minBathrooms = parseInt(req.query.minBathrooms as string);
      }

      // Check if requesting featured properties
      if (req.query.featured === "true") {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
        const properties = await storage.getFeaturedProperties(limit);
        return res.json(properties);
      }

      const sortBy = req.query.sortBy as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const excludeId = req.query.exclude as string | undefined;
      
      let properties = await storage.getProperties(filters, sortBy);
      
      // Apply limit if specified
      if (limit && limit > 0) {
        properties = properties.slice(0, limit);
      }
      
      // Exclude specific property if specified
      if (excludeId) {
        properties = properties.filter(p => p.id !== excludeId);
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Get single property by ID
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Create new property
  app.post("/api/properties", async (req, res) => {
    try {
      const validationResult = insertPropertySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }

      const property = await storage.createProperty(validationResult.data);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Update property
  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // ==================== ENQUIRIES ====================

  // Get all enquiries
  app.get("/api/inquiries", async (req, res) => {
    try {
      const enquiries = await storage.getEnquiries();
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ error: "Failed to fetch enquiries" });
    }
  });

  // Create new enquiry
  app.post("/api/inquiries", async (req, res) => {
    try {
      const validationResult = insertEnquirySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }

      const enquiry = await storage.createEnquiry(validationResult.data);
      res.status(201).json(enquiry);
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({ error: "Failed to create enquiry" });
    }
  });

  // Update enquiry status
  app.patch("/api/inquiries/:id", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const enquiry = await storage.updateEnquiryStatus(req.params.id, status);
      if (!enquiry) {
        return res.status(404).json({ error: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ error: "Failed to update enquiry" });
    }
  });

  // ==================== FEATURE FLAGS ====================

  // Get all feature flags
  app.get("/api/feature-flags", async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  // Update feature flag
  app.patch("/api/feature-flags/:id", async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "Enabled must be a boolean" });
      }

      const flag = await storage.updateFeatureFlag(req.params.id, enabled);
      if (!flag) {
        return res.status(404).json({ error: "Feature flag not found" });
      }
      res.json(flag);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ error: "Failed to update feature flag" });
    }
  });

  return httpServer;
}
