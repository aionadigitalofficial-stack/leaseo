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
      if (req.query.cityId) {
        filters.cityId = req.query.cityId as string;
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

  // ==================== SHORTLISTS ====================

  // Get user's shortlisted properties
  app.get("/api/shortlists", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const shortlists = await storage.getShortlists(userId);
      res.json(shortlists);
    } catch (error) {
      console.error("Error fetching shortlists:", error);
      res.status(500).json({ error: "Failed to fetch shortlists" });
    }
  });

  // Add to shortlist
  app.post("/api/shortlists", async (req, res) => {
    try {
      const { userId, propertyId, notes } = req.body;
      if (!userId || !propertyId) {
        return res.status(400).json({ error: "User ID and Property ID are required" });
      }
      const shortlist = await storage.addToShortlist({ userId, propertyId, notes });
      res.status(201).json(shortlist);
    } catch (error) {
      console.error("Error adding to shortlist:", error);
      res.status(500).json({ error: "Failed to add to shortlist" });
    }
  });

  // Remove from shortlist
  app.delete("/api/shortlists/:userId/:propertyId", async (req, res) => {
    try {
      const { userId, propertyId } = req.params;
      const deleted = await storage.removeFromShortlist(userId, propertyId);
      if (!deleted) {
        return res.status(404).json({ error: "Shortlist entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      res.status(500).json({ error: "Failed to remove from shortlist" });
    }
  });

  // ==================== REPORTS ====================

  // Get reports (admin only)
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Submit a report
  app.post("/api/reports", async (req, res) => {
    try {
      const { propertyId, reporterId, reason, description } = req.body;
      if (!propertyId || !reporterId || !reason) {
        return res.status(400).json({ error: "Property ID, Reporter ID, and Reason are required" });
      }
      const report = await storage.createReport({ propertyId, reporterId, reason, description });
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Update report status (admin only)
  app.patch("/api/reports/:id", async (req, res) => {
    try {
      const { status, reviewedBy, resolution } = req.body;
      const report = await storage.updateReportStatus(req.params.id, { status, reviewedBy, resolution });
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  // ==================== OWNER DASHBOARD ====================

  // Get owner's properties with stats
  app.get("/api/owner/properties", async (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (!ownerId) {
        return res.status(400).json({ error: "Owner ID is required" });
      }
      const properties = await storage.getOwnerProperties(ownerId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      res.status(500).json({ error: "Failed to fetch owner properties" });
    }
  });

  // Get enquiries for owner's properties
  app.get("/api/owner/enquiries", async (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (!ownerId) {
        return res.status(400).json({ error: "Owner ID is required" });
      }
      const enquiries = await storage.getOwnerEnquiries(ownerId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching owner enquiries:", error);
      res.status(500).json({ error: "Failed to fetch owner enquiries" });
    }
  });

  // ==================== TENANT DASHBOARD ====================

  // Get tenant's enquiries
  app.get("/api/tenant/enquiries", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }
      const enquiries = await storage.getTenantEnquiries(tenantId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching tenant enquiries:", error);
      res.status(500).json({ error: "Failed to fetch tenant enquiries" });
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
