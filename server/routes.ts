import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertEnquirySchema, users, roles, userRoles, blogPosts, pageContents, otpRequests, cities, localities, properties } from "@shared/schema";
import { and, gt, eq, desc } from "drizzle-orm";
import type { PropertyFilters } from "@shared/schema";
import { hashPassword, verifyPassword, generateToken, getAuthUser, authMiddleware, adminMiddleware, seedAdminUser } from "./auth";
import { db } from "./db";

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
      // Support filtering by city name (case-insensitive)
      if (req.query.city) {
        filters.city = req.query.city as string;
      }
      // Support filtering by locality name
      if (req.query.locality) {
        filters.locality = req.query.locality as string;
      }
      // Support isCommercial filter
      if (req.query.isCommercial === "true") {
        filters.isCommercial = true;
      } else if (req.query.isCommercial === "false") {
        filters.isCommercial = false;
      }
      // Support BHK filter (bedrooms)
      if (req.query.bhk) {
        const bhkValues = (req.query.bhk as string).split(",").map(v => parseInt(v)).filter(v => !isNaN(v));
        if (bhkValues.length > 0) {
          filters.bhk = bhkValues;
        }
      }
      // Support furnishing filter
      if (req.query.furnishing) {
        filters.furnishing = (req.query.furnishing as string).split(",");
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
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const excludeId = req.query.exclude as string | undefined;
      
      let properties = await storage.getProperties(filters, sortBy);
      
      // Apply offset
      if (offset > 0) {
        properties = properties.slice(offset);
      }
      
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

  // Get all enquiries (supports both /api/enquiries and /api/inquiries)
  const getEnquiriesHandler = async (req: any, res: any) => {
    try {
      const enquiries = await storage.getEnquiries();
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ error: "Failed to fetch enquiries" });
    }
  };
  app.get("/api/inquiries", getEnquiriesHandler);
  app.get("/api/enquiries", getEnquiriesHandler);

  // Create new enquiry
  const createEnquiryHandler = async (req: any, res: any) => {
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
  };
  app.post("/api/inquiries", createEnquiryHandler);
  app.post("/api/enquiries", createEnquiryHandler);

  // Update enquiry status
  const updateEnquiryHandler = async (req: any, res: any) => {
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
  };
  app.patch("/api/inquiries/:id", updateEnquiryHandler);
  app.patch("/api/enquiries/:id", updateEnquiryHandler);

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

  // ==================== AUTHENTICATION ====================

  // Seed admin on startup
  await seedAdminUser();

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);

      let [tenantRole] = await db.select().from(roles).where(eq(roles.name, "residential_tenant"));
      if (!tenantRole) {
        [tenantRole] = await db.insert(roles).values({
          name: "residential_tenant",
          displayName: "Residential Tenant",
          description: "Looking for residential property",
          isActive: true,
        }).returning();
      }

      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        isActive: true,
        profileCompleted: false,
        activeRoleId: tenantRole.id,
      }).returning();

      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: tenantRole.id,
      });

      const authUser = await getAuthUser(newUser.id);
      const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        isAdmin: false,
      });

      res.status(201).json({
        user: authUser,
        token,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

      const authUser = await getAuthUser(user.id);
      const token = generateToken({
        userId: user.id,
        email: user.email,
        isAdmin: authUser?.isAdmin || false,
      });

      res.json({
        user: authUser,
        token,
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ==================== OTP VERIFICATION ====================

  // Send OTP (email or phone)
  app.post("/api/auth/otp/send", async (req, res) => {
    try {
      const { email, phone, purpose = "verify_email" } = req.body;

      if (!email && !phone) {
        return res.status(400).json({ error: "Email or phone is required" });
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await hashPassword(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing OTPs for this email/phone
      if (email) {
        await db.delete(otpRequests).where(eq(otpRequests.email, email));
      }
      if (phone) {
        await db.delete(otpRequests).where(eq(otpRequests.phone, phone));
      }

      // Create new OTP request
      await db.insert(otpRequests).values({
        email: email || null,
        phone: phone || null,
        codeHash,
        purpose: purpose as any,
        expiresAt,
        attemptCount: 0,
        maxAttempts: 3,
      });

      // In development, log OTP. In production, send via email/SMS
      console.log(`[OTP] Code for ${email || phone}: ${code}`);

      // TODO: Integrate with email/SMS service for production
      // For now, we'll return success and log the OTP

      res.json({ 
        success: true, 
        message: `Verification code sent to ${email || phone}`,
        // In development mode, include code for testing
        ...(process.env.NODE_ENV === "development" && { devCode: code })
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Verify OTP
  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      const { email, phone, code } = req.body;

      if (!email && !phone) {
        return res.status(400).json({ error: "Email or phone is required" });
      }

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      // Find valid OTP
      const [otpRequest] = await db.select().from(otpRequests).where(
        and(
          email ? eq(otpRequests.email, email) : eq(otpRequests.phone, phone!),
          gt(otpRequests.expiresAt, new Date())
        )
      );

      if (!otpRequest) {
        return res.status(400).json({ error: "Verification code expired or not found" });
      }

      if (otpRequest.attemptCount && otpRequest.attemptCount >= (otpRequest.maxAttempts || 3)) {
        return res.status(400).json({ error: "Too many attempts. Please request a new code" });
      }

      // Verify code
      const isValid = await verifyPassword(code, otpRequest.codeHash);

      if (!isValid) {
        // Increment attempt count
        await db.update(otpRequests)
          .set({ attemptCount: (otpRequest.attemptCount || 0) + 1 })
          .where(eq(otpRequests.id, otpRequest.id));
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Mark OTP as consumed
      await db.update(otpRequests)
        .set({ consumedAt: new Date() })
        .where(eq(otpRequests.id, otpRequest.id));

      // If verifying for a user, update their verified status
      if (email) {
        await db.update(users)
          .set({ emailVerifiedAt: new Date() })
          .where(eq(users.email, email));
      }
      if (phone) {
        await db.update(users)
          .set({ phoneVerifiedAt: new Date() })
          .where(eq(users.phone, phone));
      }

      res.json({ 
        success: true, 
        message: "Verification successful",
        verified: true
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });

  // Check verification status
  app.get("/api/auth/verification-status", async (req, res) => {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({ error: "Email or phone is required" });
      }

      const [user] = await db.select().from(users).where(
        email ? eq(users.email, email as string) : eq(users.phone, phone as string)
      );

      if (!user) {
        return res.json({ emailVerified: false, phoneVerified: false });
      }

      res.json({
        emailVerified: !!user.emailVerifiedAt,
        phoneVerified: !!user.phoneVerifiedAt,
      });
    } catch (error) {
      console.error("Error checking verification status:", error);
      res.status(500).json({ error: "Failed to check verification status" });
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

  // ==================== BLOG POSTS (Admin) ====================

  // Get all blog posts
  app.get("/api/blog", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      let posts;
      if (status === "published") {
        posts = await db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt));
      } else {
        posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
      }
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by slug
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug));
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Create blog post (admin only)
  app.post("/api/admin/blog", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { title, slug, excerpt, content, featuredImage, status, tags } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const [post] = await db.insert(blogPosts).values({
        title,
        slug: postSlug,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImage || null,
        authorId: req.user!.id,
        status: status || "draft",
        tags: tags || [],
        publishedAt: status === "published" ? new Date() : null,
      }).returning();

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Update blog post (admin only)
  app.patch("/api/admin/blog/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { title, slug, excerpt, content, featuredImage, status, tags } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;
      if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "published") updateData.publishedAt = new Date();
      }
      if (tags !== undefined) updateData.tags = tags;

      const [post] = await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, req.params.id)).returning();
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  // Delete blog post (admin only)
  app.delete("/api/admin/blog/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // ==================== PAGE CONTENT (CMS - Admin) ====================

  // Get page content
  app.get("/api/pages/:key", async (req, res) => {
    try {
      const [page] = await db.select().from(pageContents).where(eq(pageContents.pageKey, req.params.key));
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ error: "Failed to fetch page content" });
    }
  });

  // Update/Create page content (admin only)
  app.put("/api/admin/pages/:key", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const [existing] = await db.select().from(pageContents).where(eq(pageContents.pageKey, req.params.key));
      
      let page;
      if (existing) {
        [page] = await db.update(pageContents).set({
          title,
          content,
          lastEditedBy: req.user!.id,
          updatedAt: new Date(),
        }).where(eq(pageContents.pageKey, req.params.key)).returning();
      } else {
        [page] = await db.insert(pageContents).values({
          pageKey: req.params.key,
          title,
          content,
          lastEditedBy: req.user!.id,
        }).returning();
      }

      res.json(page);
    } catch (error) {
      console.error("Error updating page content:", error);
      res.status(500).json({ error: "Failed to update page content" });
    }
  });

  // Get all pages (admin only)
  app.get("/api/admin/pages", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const pages = await db.select().from(pageContents).orderBy(pageContents.pageKey);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching pages:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  // ==================== CITIES & LOCALITIES ====================

  // Get all cities
  app.get("/api/cities", async (req, res) => {
    try {
      const allCities = await db.select().from(cities).where(eq(cities.isActive, true)).orderBy(cities.name);
      res.json(allCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // Create city (admin only)
  app.post("/api/cities", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, state } = req.body;
      if (!name || !state) {
        return res.status(400).json({ error: "Name and state are required" });
      }
      const [city] = await db.insert(cities).values({ name, state }).returning();
      res.status(201).json(city);
    } catch (error) {
      console.error("Error creating city:", error);
      res.status(500).json({ error: "Failed to create city" });
    }
  });

  // Delete city (admin only)
  app.delete("/api/cities/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(cities).where(eq(cities.id, req.params.id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "City not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting city:", error);
      res.status(500).json({ error: "Failed to delete city" });
    }
  });

  // Get all localities
  app.get("/api/localities", async (req, res) => {
    try {
      const cityId = req.query.cityId as string;
      let query = db.select().from(localities).where(eq(localities.isActive, true)).orderBy(localities.name);
      
      if (cityId) {
        const results = await db.select().from(localities).where(and(eq(localities.isActive, true), eq(localities.cityId, cityId))).orderBy(localities.name);
        return res.json(results);
      }
      
      const allLocalities = await db.select().from(localities).where(eq(localities.isActive, true)).orderBy(localities.name);
      res.json(allLocalities);
    } catch (error) {
      console.error("Error fetching localities:", error);
      res.status(500).json({ error: "Failed to fetch localities" });
    }
  });

  // Create locality (admin only)
  app.post("/api/localities", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, cityId, pincode } = req.body;
      if (!name || !cityId) {
        return res.status(400).json({ error: "Name and city are required" });
      }
      const [locality] = await db.insert(localities).values({ name, cityId, pincode }).returning();
      res.status(201).json(locality);
    } catch (error) {
      console.error("Error creating locality:", error);
      res.status(500).json({ error: "Failed to create locality" });
    }
  });

  // Delete locality (admin only)
  app.delete("/api/localities/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(localities).where(eq(localities.id, req.params.id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Locality not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting locality:", error);
      res.status(500).json({ error: "Failed to delete locality" });
    }
  });

  // ==================== BLOG (PUBLIC) ====================

  // Get all published blog posts
  app.get("/api/blog", async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get blog post by slug
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug));
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Create blog post (admin only)
  app.post("/api/blog", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { title, slug, excerpt, content, category, status } = req.body;
      if (!title || !slug || !content) {
        return res.status(400).json({ error: "Title, slug, and content are required" });
      }
      const [post] = await db.insert(blogPosts).values({
        title,
        slug,
        excerpt,
        content,
        status: status || "draft",
        publishedAt: status === "published" ? new Date() : null,
      }).returning();
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Delete blog post (admin only)
  app.delete("/api/blog/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // ==================== EMPLOYEES (Admin) ====================

  // Get all employees (admin only)
  app.get("/api/admin/employees", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const adminRole = await db.select().from(roles).where(eq(roles.name, "admin"));
      if (adminRole.length === 0) {
        return res.json([]);
      }
      
      const adminUsers = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: roles.name,
        })
        .from(userRoles)
        .innerJoin(users, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.name, "admin"));
      
      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Add employee (admin only)
  app.post("/api/admin/employees", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ error: "Email, first name, and last name are required" });
      }

      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Create user
      const [newUser] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        profileCompleted: true,
      }).returning();

      // Assign admin role
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin"));
      if (adminRole) {
        await db.insert(userRoles).values({
          userId: newUser.id,
          roleId: adminRole.id,
        });
      }

      res.status(201).json({ ...newUser, role: "admin" });
    } catch (error) {
      console.error("Error adding employee:", error);
      res.status(500).json({ error: "Failed to add employee" });
    }
  });

  // Delete employee (admin only)
  app.delete("/api/admin/employees/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Remove role assignments
      await db.delete(userRoles).where(eq(userRoles.userId, req.params.id));
      // Delete user
      const [deleted] = await db.delete(users).where(eq(users.id, req.params.id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // ==================== SEO SETTINGS ====================

  // Get SEO settings (admin only)
  app.get("/api/admin/seo-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // For now, return default settings
      res.json({
        metaTitle: "Leaseo - Zero Brokerage Property Rentals in India",
        metaDescription: "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more.",
        robotsTxt: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://leaseo.in/sitemap.xml`,
      });
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      res.status(500).json({ error: "Failed to fetch SEO settings" });
    }
  });

  // Save SEO settings (admin only)
  app.post("/api/admin/seo-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { metaTitle, metaDescription, robotsTxt } = req.body;
      // In a real app, save to database or file
      console.log("Saving SEO settings:", { metaTitle, metaDescription, robotsTxt });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving SEO settings:", error);
      res.status(500).json({ error: "Failed to save SEO settings" });
    }
  });

  // Generate sitemap (admin only)
  app.post("/api/admin/generate-sitemap", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allProperties = await db.select({ id: properties.id }).from(properties).where(eq(properties.status, "active"));
      const allCities = await db.select({ id: cities.id, name: cities.name }).from(cities).where(eq(cities.isActive, true));
      const allBlogPosts = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.status, "published"));
      
      const baseUrl = "https://leaseo.in";
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      // Static pages
      const staticPages = ["/", "/properties", "/about", "/contact", "/blog"];
      staticPages.forEach(page => {
        sitemap += `  <url><loc>${baseUrl}${page}</loc><changefreq>weekly</changefreq></url>\n`;
      });
      
      // Property pages
      allProperties.forEach(p => {
        sitemap += `  <url><loc>${baseUrl}/properties/${p.id}</loc><changefreq>daily</changefreq></url>\n`;
      });
      
      // City pages
      allCities.forEach(c => {
        sitemap += `  <url><loc>${baseUrl}/properties?city=${encodeURIComponent(c.name)}</loc><changefreq>weekly</changefreq></url>\n`;
      });
      
      // Blog posts
      allBlogPosts.forEach(b => {
        sitemap += `  <url><loc>${baseUrl}/blog/${b.slug}</loc><changefreq>monthly</changefreq></url>\n`;
      });
      
      sitemap += `</urlset>`;
      
      console.log("Generated sitemap with", allProperties.length, "properties,", allCities.length, "cities,", allBlogPosts.length, "blog posts");
      res.json({ success: true, message: "Sitemap generated" });
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).json({ error: "Failed to generate sitemap" });
    }
  });

  return httpServer;
}
