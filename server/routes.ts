import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertEnquirySchema, users, roles, userRoles, permissions, rolePermissions, blogPosts, pageContents, pageVersions, otpRequests, cities, localities, properties, propertyImages, propertyCategories, listingBoosts, payments, enquiries, paymentProviders, notificationProviders, siteSettings } from "@shared/schema";
import { and, gt, eq, desc, asc, sql, isNotNull } from "drizzle-orm";
import type { PropertyFilters } from "@shared/schema";
import { hashPassword, verifyPassword, generateToken, getAuthUser, authMiddleware, adminMiddleware, optionalAuthMiddleware, verifyToken, seedAdminUser, seedTestUsers } from "./auth";
import { db } from "./db";
import DOMPurify from "isomorphic-dompurify";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'a', 'br', 'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
};

const sanitizePageContent = (content: unknown): unknown => {
  if (typeof content === 'string') {
    return sanitizeHtml(content);
  }
  if (Array.isArray(content)) {
    return content.map(item => sanitizePageContent(item));
  }
  if (typeof content === 'object' && content !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      sanitized[key] = sanitizePageContent(value);
    }
    return sanitized;
  }
  return content;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize feature flags on startup
  await (storage as any).initializeFeatureFlags?.();

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // ==================== PROPERTIES ====================

  // Get all properties with optional filters
  app.get("/api/properties", async (req, res) => {
    try {
      const filters: PropertyFilters = {};
      
      // Support segment-based filtering (maps to listingType and isCommercial)
      if (req.query.segment) {
        const segment = req.query.segment as string;
        if (segment === "rent") {
          filters.listingType = "rent";
          filters.isCommercial = false;
        } else if (segment === "buy") {
          filters.listingType = "sale";
          filters.isCommercial = false;
        } else if (segment === "commercial") {
          filters.isCommercial = true;
        }
      }
      
      // Direct listingType filter (overrides segment if both provided)
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
      // Support isCommercial filter (overrides segment if provided)
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

  // Create new property - requires authentication
  app.post("/api/properties", authMiddleware, async (req, res) => {
    try {
      // Preprocess: convert date strings to Date objects
      const body = { ...req.body };
      if (body.availableFrom && typeof body.availableFrom === "string") {
        body.availableFrom = new Date(body.availableFrom);
      }
      
      // Always link property to authenticated user
      body.ownerId = req.user!.id;
      console.log(`[Property] Creating property for authenticated user: ${req.user!.id}`);
      
      const validationResult = insertPropertySchema.safeParse(body);
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

  // Update property - requires authentication and ownership
  app.patch("/api/properties/:id", authMiddleware, async (req, res) => {
    try {
      // First check if property exists and user owns it
      const existingProperty = await storage.getProperty(req.params.id);
      if (!existingProperty) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Verify ownership (unless admin)
      const isAdmin = req.user?.activeRoleId === "admin";
      if (!isAdmin && existingProperty.ownerId !== req.user?.id) {
        return res.status(403).json({ error: "You don't have permission to update this property" });
      }
      
      // Don't allow changing ownerId
      const { ownerId, ...updateData } = req.body;
      
      const property = await storage.updateProperty(req.params.id, updateData);
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

  // Seed admin and test users on startup
  await seedAdminUser();
  await seedTestUsers();

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

  // Reset password (authenticated user)
  app.post("/api/auth/reset-password", authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      if (!/\d/.test(newPassword)) {
        return res.status(400).json({ error: "New password must contain at least one number" });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "New password must contain at least one uppercase letter" });
      }

      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ error: "New password must contain at least one lowercase letter" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ error: "No password set for this account. Please use OTP login." });
      }

      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
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

      // Send OTP via email or SMS
      console.log(`[OTP] Code for ${email || phone}: ${code}`);

      let emailSent = false;
      if (email) {
        const { sendOTPEmail } = await import("./email");
        emailSent = await sendOTPEmail(email, code);
      }

      // TODO: Add SMS service for phone OTP (e.g., Twilio, MSG91)
      
      res.json({ 
        success: true, 
        message: `Verification code sent to ${email || phone}`,
        emailSent,
        // In development mode, include code for testing
        ...(process.env.NODE_ENV === "development" && { devCode: code })
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Verify OTP - also creates/logs in user for property listing flow
  app.post("/api/auth/otp/verify", async (req, res) => {
    try {
      const { email, phone, code, segment, createAccount } = req.body;

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

      // Check if this is for property listing (createAccount flag from frontend)
      if (createAccount) {
        // Find or create user
        let [existingUser] = await db.select().from(users).where(
          email ? eq(users.email, email) : eq(users.phone, phone!)
        );

        let user = existingUser;
        
        // Determine the owner role based on segment
        const roleName = segment === "commercial" ? "commercial_owner" : "residential_owner";
        const [ownerRole] = await db.select().from(roles).where(eq(roles.name, roleName));

        if (!user) {
          // Create new user
          const [newUser] = await db.insert(users).values({
            email: email || null,
            phone: phone || null,
            emailVerifiedAt: email ? new Date() : null,
            phoneVerifiedAt: phone ? new Date() : null,
            activeRoleId: ownerRole?.id || null,
            isActive: true,
          }).returning();
          user = newUser;

          // Assign owner role
          if (ownerRole && user) {
            await db.insert(userRoles).values({
              userId: user.id,
              roleId: ownerRole.id,
            }).onConflictDoNothing();
          }
          
          console.log(`[OTP] Created new owner account: ${email || phone} with role ${roleName}`);
        } else {
          // Update verification status for existing user
          if (email && !user.emailVerifiedAt) {
            await db.update(users)
              .set({ emailVerifiedAt: new Date() })
              .where(eq(users.id, user.id));
          }
          if (phone && !user.phoneVerifiedAt) {
            await db.update(users)
              .set({ phoneVerifiedAt: new Date() })
              .where(eq(users.id, user.id));
          }
          
          // Ensure user has owner role
          if (ownerRole) {
            const [existingUserRole] = await db.select().from(userRoles).where(
              and(
                eq(userRoles.userId, user.id),
                eq(userRoles.roleId, ownerRole.id)
              )
            );
            if (!existingUserRole) {
              await db.insert(userRoles).values({
                userId: user.id,
                roleId: ownerRole.id,
              }).onConflictDoNothing();
            }
            // Update active role to owner role if not set
            if (!user.activeRoleId) {
              await db.update(users)
                .set({ activeRoleId: ownerRole.id })
                .where(eq(users.id, user.id));
              user.activeRoleId = ownerRole.id;
            }
          }
          
          console.log(`[OTP] Existing user verified: ${email || phone}`);
        }

        // Get updated user info with roles
        const authUser = await getAuthUser(user.id);
        
        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email,
          isAdmin: authUser?.isAdmin || false,
        });

        return res.json({ 
          success: true, 
          message: "Verification successful",
          verified: true,
          user: authUser,
          token,
        });
      }

      // Standard OTP verification (no account creation)
      // If verifying for an existing user, update their verified status
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
      const { title, slug, excerpt, content, featuredImage, status, tags, metaTitle, metaDescription } = req.body;
      
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
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
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
      const { title, slug, excerpt, content, featuredImage, status, tags, metaTitle, metaDescription } = req.body;
      
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
      if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
      if (metaDescription !== undefined) updateData.metaDescription = metaDescription;

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
  // These are public routes for the frontend blog pages

  // Get all published blog posts (public)
  app.get("/api/public/blog", async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get blog post by slug (public)
  app.get("/api/public/blog/:slug", async (req, res) => {
    try {
      const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, req.params.slug), eq(blogPosts.status, "published")));
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Update blog post (legacy route - kept for backwards compatibility)
  app.patch("/api/blog/:id", async (req, res) => {
    try {
      const { title, slug, excerpt, content, status, metaTitle, metaDescription } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (content !== undefined) updateData.content = content;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "published") updateData.publishedAt = new Date();
      }
      if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
      if (metaDescription !== undefined) updateData.metaDescription = metaDescription;

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

  // Get property owners (users who have listed properties)
  app.get("/api/admin/property-owners", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Get distinct owner IDs from properties
      const propertyOwners = await db
        .selectDistinct({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          isActive: users.isActive,
        })
        .from(properties)
        .innerJoin(users, eq(properties.ownerId, users.id))
        .where(isNotNull(properties.ownerId));
      
      // Add property count for each owner
      const ownersWithCount = await Promise.all(
        propertyOwners.map(async (owner) => {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(properties)
            .where(eq(properties.ownerId, owner.id));
          return {
            ...owner,
            propertyCount: Number(count?.count || 0),
          };
        })
      );
      
      res.json(ownersWithCount);
    } catch (error) {
      console.error("Error fetching property owners:", error);
      res.status(500).json({ error: "Failed to fetch property owners" });
    }
  });

  // Get all login users (owners, buyers, renters - everyone except admin employees)
  app.get("/api/admin/login-users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      
      // Get roles for each user
      const usersWithRoles = await Promise.all(
        allUsers.map(async (user) => {
          const userRolesList = await db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, user.id));
          
          return {
            ...user,
            roles: userRolesList.map(r => r.roleName),
          };
        })
      );
      
      res.json(usersWithRoles);
    } catch (error) {
      console.error("Error fetching login users:", error);
      res.status(500).json({ error: "Failed to fetch login users" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Find the user
      const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      const [updated] = await db.update(users)
        .set({ passwordHash: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, req.params.id))
        .returning();
      
      console.log(`Admin ${req.user!.email} reset password for user ${user.email}`);
      
      res.json({ success: true, message: `Password reset for ${user.email}` });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ==================== SEO SETTINGS ====================

  // Get SEO settings (admin only)
  app.get("/api/admin/seo-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const result = await db.select().from(siteSettings).where(
        sql`${siteSettings.key} IN ('metaTitle', 'metaDescription', 'robotsTxt', 'googleAnalyticsCode', 'googleWebmasterCode')`
      );
      const settings: Record<string, string> = {};
      result.forEach(row => {
        if (row.key && row.value) settings[row.key] = row.value;
      });
      
      res.json({
        metaTitle: settings.metaTitle || "Leaseo - Zero Brokerage Property Rentals in India",
        metaDescription: settings.metaDescription || "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more.",
        robotsTxt: settings.robotsTxt || `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://leaseo.in/sitemap.xml`,
        googleAnalyticsCode: settings.googleAnalyticsCode || "",
        googleWebmasterCode: settings.googleWebmasterCode || "",
      });
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      res.status(500).json({ error: "Failed to fetch SEO settings" });
    }
  });

  // Save SEO settings (admin only)
  app.post("/api/admin/seo-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { metaTitle, metaDescription, robotsTxt, googleAnalyticsCode, googleWebmasterCode } = req.body;
      
      const settingsToSave = [
        { key: 'metaTitle', value: metaTitle || '' },
        { key: 'metaDescription', value: metaDescription || '' },
        { key: 'robotsTxt', value: robotsTxt || '' },
        { key: 'googleAnalyticsCode', value: googleAnalyticsCode || '' },
        { key: 'googleWebmasterCode', value: googleWebmasterCode || '' },
      ];
      
      for (const setting of settingsToSave) {
        await db.insert(siteSettings)
          .values({ key: setting.key, value: setting.value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: setting.value, updatedAt: new Date() }
          });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving SEO settings:", error);
      res.status(500).json({ error: "Failed to save SEO settings" });
    }
  });
  
  // Public endpoint to get tracking codes (for frontend)
  app.get("/api/tracking-codes", async (req, res) => {
    try {
      const result = await db.select().from(siteSettings).where(
        sql`${siteSettings.key} IN ('googleAnalyticsCode', 'googleWebmasterCode')`
      );
      const settings: Record<string, string> = {};
      result.forEach(row => {
        if (row.key && row.value) settings[row.key] = row.value;
      });
      res.json({
        googleAnalyticsCode: settings.googleAnalyticsCode || "",
        googleWebmasterCode: settings.googleWebmasterCode || "",
      });
    } catch (error) {
      res.json({ googleAnalyticsCode: "", googleWebmasterCode: "" });
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

  // ==================== PROPERTY CATEGORIES ====================

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await db.select().from(propertyCategories).orderBy(propertyCategories.displayOrder);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get category tree (hierarchical view)
  app.get("/api/categories/tree", async (req, res) => {
    try {
      const allCategories = await db.select().from(propertyCategories).orderBy(propertyCategories.displayOrder);
      
      // Separate main categories (no parentId) and subcategories
      const mainCategories = allCategories.filter(c => !c.parentId);
      const subcategories = allCategories.filter(c => c.parentId);
      
      // Build tree structure
      const tree = mainCategories.map(main => ({
        ...main,
        children: subcategories.filter(sub => sub.parentId === main.id)
      }));
      
      res.json(tree);
    } catch (error) {
      console.error("Error fetching category tree:", error);
      res.status(500).json({ error: "Failed to fetch category tree" });
    }
  });

  // Get categories by segment (rent/buy/commercial)
  app.get("/api/categories/segment/:segment", async (req, res) => {
    try {
      const { segment } = req.params;
      if (!["rent", "buy", "commercial"].includes(segment)) {
        return res.status(400).json({ error: "Invalid segment. Must be rent, buy, or commercial" });
      }
      
      const categories = await db.select()
        .from(propertyCategories)
        .where(eq(propertyCategories.segment, segment))
        .orderBy(propertyCategories.displayOrder);
      
      // Separate main category and subcategories
      const mainCategory = categories.find(c => !c.parentId);
      const subcategories = categories.filter(c => c.parentId);
      
      res.json({
        main: mainCategory,
        subcategories
      });
    } catch (error) {
      console.error("Error fetching segment categories:", error);
      res.status(500).json({ error: "Failed to fetch segment categories" });
    }
  });

  // Create category (admin only)
  app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, description, icon, displayOrder, parentId, segment, supportsRent, supportsSale, isCommercial } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }
      // Create slug with segment prefix for subcategories
      const slugBase = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const slug = parentId && segment ? `${segment}-${slugBase}` : slugBase;
      
      const [category] = await db.insert(propertyCategories).values({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        displayOrder: displayOrder || 0,
        parentId: parentId || null,
        segment: segment || "rent",
        supportsRent: supportsRent !== undefined ? supportsRent : true,
        supportsSale: supportsSale !== undefined ? supportsSale : false,
        isCommercial: isCommercial !== undefined ? isCommercial : false,
      }).returning();
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update category (admin only)
  app.patch("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, description, icon, displayOrder, isActive, parentId, segment, supportsRent, supportsSale, isCommercial } = req.body;
      const updateData: any = {};
      if (name !== undefined) {
        updateData.name = name;
        // Update slug with segment prefix if applicable
        const slugBase = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        updateData.slug = segment && parentId ? `${segment}-${slugBase}` : slugBase;
      }
      if (description !== undefined) updateData.description = description;
      if (icon !== undefined) updateData.icon = icon;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (parentId !== undefined) updateData.parentId = parentId;
      if (segment !== undefined) updateData.segment = segment;
      if (supportsRent !== undefined) updateData.supportsRent = supportsRent;
      if (supportsSale !== undefined) updateData.supportsSale = supportsSale;
      if (isCommercial !== undefined) updateData.isCommercial = isCommercial;

      const [updated] = await db.update(propertyCategories)
        .set(updateData)
        .where(eq(propertyCategories.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // Delete category (admin only)
  app.delete("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(propertyCategories)
        .where(eq(propertyCategories.id, req.params.id))
        .returning();
      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ==================== PROPERTY IMAGES ====================

  // Get images for a property
  app.get("/api/properties/:id/images", async (req, res) => {
    try {
      const images = await db.select().from(propertyImages)
        .where(eq(propertyImages.propertyId, req.params.id))
        .orderBy(propertyImages.displayOrder);
      res.json(images);
    } catch (error) {
      console.error("Error fetching property images:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  // Upload image for property (returns URL - actual file handling would be done by Replit Object Storage)
  app.post("/api/properties/:id/images", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { url, caption, isPrimary, isVideo, fileSize } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      // Get next display order
      const existingImages = await db.select().from(propertyImages)
        .where(eq(propertyImages.propertyId, req.params.id));
      const displayOrder = existingImages.length;

      const [image] = await db.insert(propertyImages).values({
        propertyId: req.params.id,
        url,
        caption: caption || null,
        displayOrder,
        isPrimary: isPrimary || false,
        isApproved: false,
        isVideo: isVideo || false,
        fileSize: fileSize || null,
      }).returning();

      res.status(201).json(image);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Approve/reject image (admin only)
  app.patch("/api/property-images/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { isApproved } = req.body;
      const [updated] = await db.update(propertyImages)
        .set({ isApproved: isApproved !== false })
        .where(eq(propertyImages.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating image approval:", error);
      res.status(500).json({ error: "Failed to update image" });
    }
  });

  // Delete image (admin only)
  app.delete("/api/property-images/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(propertyImages)
        .where(eq(propertyImages.id, req.params.id))
        .returning();
      if (!deleted) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Get all images pending approval (admin only)
  app.get("/api/admin/pending-images", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const pendingImages = await db.select().from(propertyImages)
        .where(eq(propertyImages.isApproved, false))
        .orderBy(desc(propertyImages.createdAt));
      res.json(pendingImages);
    } catch (error) {
      console.error("Error fetching pending images:", error);
      res.status(500).json({ error: "Failed to fetch pending images" });
    }
  });

  // ==================== LIVE PAGE EDITING ====================

  // Get all pages (public: published only, admin: all)
  app.get("/api/pages", optionalAuthMiddleware, async (req, res) => {
    try {
      const isAdmin = req.user?.isAdmin;

      let pages;
      if (isAdmin) {
        pages = await db.select().from(pageContents).orderBy(pageContents.pageKey);
      } else {
        pages = await db.select().from(pageContents)
          .where(eq(pageContents.status, "published"))
          .orderBy(pageContents.pageKey);
      }
      res.json(pages);
    } catch (error) {
      console.error("Error fetching pages:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  // Get single page by slug (public: published only, admin: any)
  app.get("/api/pages/:slug", optionalAuthMiddleware, async (req, res) => {
    try {
      const isAdmin = req.user?.isAdmin;

      const [page] = await db.select().from(pageContents)
        .where(eq(pageContents.pageKey, req.params.slug));

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      if (page.status !== "published" && !isAdmin) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      console.error("Error fetching page:", error);
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  // Create page (admin only)
  app.post("/api/pages", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { pageKey, title, content, metaTitle, metaDescription, status } = req.body;
      if (!pageKey || !title) {
        return res.status(400).json({ error: "Page key and title are required" });
      }

      const [page] = await db.insert(pageContents).values({
        pageKey: sanitizeHtml(pageKey),
        title: sanitizeHtml(title),
        content: content ? sanitizePageContent(content) : {},
        metaTitle: sanitizeHtml(metaTitle || title),
        metaDescription: sanitizeHtml(metaDescription || ""),
        status: status || "draft",
        lastEditedBy: req.user?.id,
      }).returning();

      res.status(201).json(page);
    } catch (error: any) {
      console.error("Error creating page:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Page with this key already exists" });
      }
      res.status(500).json({ error: "Failed to create page" });
    }
  });

  // Update page content (admin only) - creates version automatically
  app.patch("/api/pages/:slug", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { title, content, metaTitle, metaDescription, status } = req.body;

      // Get current page
      const [currentPage] = await db.select().from(pageContents)
        .where(eq(pageContents.pageKey, req.params.slug));

      if (!currentPage) {
        return res.status(404).json({ error: "Page not found" });
      }

      // Save current version before updating
      const [latestVersion] = await db.select()
        .from(pageVersions)
        .where(eq(pageVersions.pageId, currentPage.id))
        .orderBy(desc(pageVersions.versionNumber))
        .limit(1);

      const nextVersion = (latestVersion?.versionNumber || 0) + 1;

      await db.insert(pageVersions).values({
        pageId: currentPage.id,
        content: currentPage.content,
        metaTitle: currentPage.metaTitle,
        metaDescription: currentPage.metaDescription,
        versionNumber: nextVersion,
        editedBy: req.user?.id,
      });

      // Update page with sanitized content
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = sanitizeHtml(title);
      if (content !== undefined) updateData.content = sanitizePageContent(content);
      if (metaTitle !== undefined) updateData.metaTitle = sanitizeHtml(metaTitle);
      if (metaDescription !== undefined) updateData.metaDescription = sanitizeHtml(metaDescription);
      if (status !== undefined) updateData.status = status;
      if (req.user?.id) updateData.lastEditedBy = req.user.id;

      const [updated] = await db.update(pageContents)
        .set(updateData)
        .where(eq(pageContents.pageKey, req.params.slug))
        .returning();

      res.json({ ...updated, versionNumber: nextVersion });
    } catch (error) {
      console.error("Error updating page:", error);
      res.status(500).json({ error: "Failed to update page" });
    }
  });

  // Get page version history (admin only)
  app.get("/api/pages/:slug/versions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [page] = await db.select().from(pageContents)
        .where(eq(pageContents.pageKey, req.params.slug));

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      const versions = await db.select({
        id: pageVersions.id,
        versionNumber: pageVersions.versionNumber,
        metaTitle: pageVersions.metaTitle,
        createdAt: pageVersions.createdAt,
        editedBy: pageVersions.editedBy,
      })
        .from(pageVersions)
        .where(eq(pageVersions.pageId, page.id))
        .orderBy(desc(pageVersions.versionNumber));

      res.json(versions);
    } catch (error) {
      console.error("Error fetching page versions:", error);
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // Get specific version content (admin only)
  app.get("/api/pages/:slug/versions/:versionId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [version] = await db.select().from(pageVersions)
        .where(eq(pageVersions.id, req.params.versionId));

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.json(version);
    } catch (error) {
      console.error("Error fetching version:", error);
      res.status(500).json({ error: "Failed to fetch version" });
    }
  });

  // Rollback to specific version (admin only)
  app.post("/api/pages/:slug/rollback", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { versionId } = req.body;
      if (!versionId) {
        return res.status(400).json({ error: "Version ID is required" });
      }

      // Get the version to restore
      const [version] = await db.select().from(pageVersions)
        .where(eq(pageVersions.id, versionId));

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Get current page
      const [currentPage] = await db.select().from(pageContents)
        .where(eq(pageContents.pageKey, req.params.slug));

      if (!currentPage) {
        return res.status(404).json({ error: "Page not found" });
      }

      // Save current as new version before rollback
      const [latestVersion] = await db.select()
        .from(pageVersions)
        .where(eq(pageVersions.pageId, currentPage.id))
        .orderBy(desc(pageVersions.versionNumber))
        .limit(1);

      const nextVersion = (latestVersion?.versionNumber || 0) + 1;

      await db.insert(pageVersions).values({
        pageId: currentPage.id,
        content: currentPage.content,
        metaTitle: currentPage.metaTitle,
        metaDescription: currentPage.metaDescription,
        versionNumber: nextVersion,
        editedBy: req.user?.id,
      });

      // Restore the selected version
      const [updated] = await db.update(pageContents)
        .set({
          content: version.content,
          metaTitle: version.metaTitle,
          metaDescription: version.metaDescription,
          lastEditedBy: req.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(pageContents.pageKey, req.params.slug))
        .returning();

      res.json({ ...updated, restoredFromVersion: version.versionNumber });
    } catch (error) {
      console.error("Error rolling back page:", error);
      res.status(500).json({ error: "Failed to rollback page" });
    }
  });

  // Delete page (admin only)
  app.delete("/api/pages/:slug", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [page] = await db.select().from(pageContents)
        .where(eq(pageContents.pageKey, req.params.slug));

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      // Delete versions first
      await db.delete(pageVersions).where(eq(pageVersions.pageId, page.id));

      // Delete page
      await db.delete(pageContents).where(eq(pageContents.id, page.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting page:", error);
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // ==================== ADMIN: LISTING BOOSTS ====================

  // Get all listing boosts (admin)
  app.get("/api/admin/boosts", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const boosts = await db.select({
        id: listingBoosts.id,
        propertyId: listingBoosts.propertyId,
        userId: listingBoosts.userId,
        boostType: listingBoosts.boostType,
        status: listingBoosts.status,
        amount: listingBoosts.amount,
        paymentId: listingBoosts.paymentId,
        startDate: listingBoosts.startDate,
        endDate: listingBoosts.endDate,
        isActive: listingBoosts.isActive,
        impressions: listingBoosts.impressions,
        clicks: listingBoosts.clicks,
        adminNotes: listingBoosts.adminNotes,
        approvedBy: listingBoosts.approvedBy,
        approvedAt: listingBoosts.approvedAt,
        createdAt: listingBoosts.createdAt,
        propertyTitle: properties.title,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
        userEmail: users.email,
      })
      .from(listingBoosts)
      .leftJoin(properties, eq(listingBoosts.propertyId, properties.id))
      .leftJoin(users, eq(listingBoosts.userId, users.id))
      .orderBy(desc(listingBoosts.createdAt));

      res.json(boosts);
    } catch (error) {
      console.error("Error fetching boosts:", error);
      res.status(500).json({ error: "Failed to fetch boosts" });
    }
  });

  // Approve boost (admin)
  app.patch("/api/admin/boosts/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const [boost] = await db.update(listingBoosts)
        .set({
          status: "approved",
          isActive: true,
          startDate: now,
          endDate,
          adminNotes,
          approvedBy: req.user?.id,
          approvedAt: now,
        })
        .where(eq(listingBoosts.id, id))
        .returning();

      if (!boost) {
        return res.status(404).json({ error: "Boost not found" });
      }

      // Update property flags based on boost type
      if (boost.boostType === "featured") {
        await db.update(properties).set({ isFeatured: true }).where(eq(properties.id, boost.propertyId));
      } else if (boost.boostType === "premium") {
        await db.update(properties).set({ isPremium: true }).where(eq(properties.id, boost.propertyId));
      }

      res.json(boost);
    } catch (error) {
      console.error("Error approving boost:", error);
      res.status(500).json({ error: "Failed to approve boost" });
    }
  });

  // Reject boost (admin)
  app.patch("/api/admin/boosts/:id/reject", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      const [boost] = await db.update(listingBoosts)
        .set({
          status: "rejected",
          isActive: false,
          adminNotes,
          approvedBy: req.user?.id,
          approvedAt: new Date(),
        })
        .where(eq(listingBoosts.id, id))
        .returning();

      if (!boost) {
        return res.status(404).json({ error: "Boost not found" });
      }

      res.json(boost);
    } catch (error) {
      console.error("Error rejecting boost:", error);
      res.status(500).json({ error: "Failed to reject boost" });
    }
  });

  // ==================== ADMIN: PAYMENTS ====================

  // Get all payments (admin)
  app.get("/api/admin/payments", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const paymentsList = await db.select({
        id: payments.id,
        userId: payments.userId,
        propertyId: payments.propertyId,
        boostId: payments.boostId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        transactionId: payments.transactionId,
        paymentRequestId: payments.paymentRequestId,
        description: payments.description,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
        userEmail: users.email,
        propertyTitle: properties.title,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .leftJoin(properties, eq(payments.propertyId, properties.id))
      .orderBy(desc(payments.createdAt));

      res.json(paymentsList);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // ==================== ADMIN: ENQUIRIES ====================

  // Get all enquiries (admin)
  app.get("/api/admin/enquiries", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const enquiriesList = await db.select({
        id: enquiries.id,
        propertyId: enquiries.propertyId,
        userId: enquiries.userId,
        name: enquiries.name,
        email: enquiries.email,
        phone: enquiries.phone,
        message: enquiries.message,
        status: enquiries.status,
        createdAt: enquiries.createdAt,
        propertyTitle: properties.title,
        propertyOwnerId: properties.ownerId,
      })
      .from(enquiries)
      .leftJoin(properties, eq(enquiries.propertyId, properties.id))
      .orderBy(desc(enquiries.createdAt));

      res.json(enquiriesList);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ error: "Failed to fetch enquiries" });
    }
  });

  // Update enquiry status (admin)
  app.patch("/api/admin/enquiries/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const [enquiry] = await db.update(enquiries)
        .set({ status })
        .where(eq(enquiries.id, id))
        .returning();

      if (!enquiry) {
        return res.status(404).json({ error: "Enquiry not found" });
      }

      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ error: "Failed to update enquiry" });
    }
  });

  // ==================== ADMIN: PAYMENT PROVIDER SETTINGS ====================

  // Get payment provider settings
  app.get("/api/admin/payment-providers/:provider", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { provider } = req.params;
      
      const [providerSettings] = await db.select()
        .from(paymentProviders)
        .where(eq(paymentProviders.providerName, provider));
      
      if (!providerSettings) {
        return res.status(404).json({ error: "Payment provider not found" });
      }
      
      // Mask sensitive credentials for security
      const maskedSettings = {
        ...providerSettings,
        apiKey: providerSettings.apiKey ? "••••••••" + providerSettings.apiKey.slice(-4) : null,
        authToken: providerSettings.authToken ? "••••••••" + providerSettings.authToken.slice(-4) : null,
        webhookSecret: providerSettings.webhookSecret ? "••••••••" : null,
        sandboxApiKey: providerSettings.sandboxApiKey ? "••••••••" + providerSettings.sandboxApiKey.slice(-4) : null,
        sandboxAuthToken: providerSettings.sandboxAuthToken ? "••••••••" + providerSettings.sandboxAuthToken.slice(-4) : null,
        hasApiKey: !!providerSettings.apiKey,
        hasAuthToken: !!providerSettings.authToken,
        hasSandboxApiKey: !!providerSettings.sandboxApiKey,
        hasSandboxAuthToken: !!providerSettings.sandboxAuthToken,
      };
      
      res.json(maskedSettings);
    } catch (error) {
      console.error("Error fetching payment provider:", error);
      res.status(500).json({ error: "Failed to fetch payment provider settings" });
    }
  });

  // Update payment provider settings
  app.put("/api/admin/payment-providers/:provider", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;
      const { 
        isActive, 
        mode, 
        apiKey, 
        authToken, 
        webhookSecret,
        sandboxApiKey,
        sandboxAuthToken,
      } = req.body;
      
      // Validate mode
      if (mode && !["sandbox", "live"].includes(mode)) {
        return res.status(400).json({ error: "Mode must be 'sandbox' or 'live'" });
      }
      
      // Build update object - only update fields that are provided
      const updateData: any = {
        updatedBy: userId,
        updatedAt: new Date(),
      };
      
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      if (mode) updateData.mode = mode;
      if (apiKey !== undefined && apiKey !== "") updateData.apiKey = apiKey;
      if (authToken !== undefined && authToken !== "") updateData.authToken = authToken;
      if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret || null;
      if (sandboxApiKey !== undefined && sandboxApiKey !== "") updateData.sandboxApiKey = sandboxApiKey;
      if (sandboxAuthToken !== undefined && sandboxAuthToken !== "") updateData.sandboxAuthToken = sandboxAuthToken;
      
      const [updated] = await db.update(paymentProviders)
        .set(updateData)
        .where(eq(paymentProviders.providerName, provider))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Payment provider not found" });
      }
      
      // Return masked response
      const maskedResponse = {
        ...updated,
        apiKey: updated.apiKey ? "••••••••" + updated.apiKey.slice(-4) : null,
        authToken: updated.authToken ? "••••••••" + updated.authToken.slice(-4) : null,
        webhookSecret: updated.webhookSecret ? "••••••••" : null,
        sandboxApiKey: updated.sandboxApiKey ? "••••••••" + updated.sandboxApiKey.slice(-4) : null,
        sandboxAuthToken: updated.sandboxAuthToken ? "••••••••" + updated.sandboxAuthToken.slice(-4) : null,
      };
      
      res.json({ success: true, provider: maskedResponse });
    } catch (error) {
      console.error("Error updating payment provider:", error);
      res.status(500).json({ error: "Failed to update payment provider settings" });
    }
  });

  // Test payment provider connection
  app.post("/api/admin/payment-providers/:provider/test", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { provider } = req.params;
      
      const [providerSettings] = await db.select()
        .from(paymentProviders)
        .where(eq(paymentProviders.providerName, provider));
      
      if (!providerSettings) {
        return res.status(404).json({ error: "Payment provider not found" });
      }
      
      // For Instamojo, test the API credentials
      if (provider === "instamojo") {
        const apiKey = providerSettings.mode === "live" 
          ? providerSettings.apiKey 
          : providerSettings.sandboxApiKey;
        const authToken = providerSettings.mode === "live" 
          ? providerSettings.authToken 
          : providerSettings.sandboxAuthToken;
        
        if (!apiKey || !authToken) {
          return res.status(400).json({ 
            success: false, 
            error: `Missing ${providerSettings.mode} mode credentials` 
          });
        }
        
        // Test Instamojo API by fetching payment requests
        const baseUrl = providerSettings.mode === "live" 
          ? "https://www.instamojo.com/api/1.1" 
          : "https://test.instamojo.com/api/1.1";
        
        try {
          const testResponse = await fetch(`${baseUrl}/payment-requests/`, {
            method: "GET",
            headers: {
              "X-Api-Key": apiKey,
              "X-Auth-Token": authToken,
            },
          });
          
          if (testResponse.ok) {
            res.json({ success: true, message: "Connection successful" });
          } else {
            const errorData = await testResponse.json();
            res.status(400).json({ 
              success: false, 
              error: errorData.message || "Invalid credentials" 
            });
          }
        } catch (fetchError) {
          res.status(400).json({ 
            success: false, 
            error: "Could not connect to Instamojo API" 
          });
        }
      } else {
        res.status(400).json({ error: "Unknown payment provider" });
      }
    } catch (error) {
      console.error("Error testing payment provider:", error);
      res.status(500).json({ error: "Failed to test payment provider" });
    }
  });

  // ==================== ADMIN: NOTIFICATION PROVIDER SETTINGS (SMS/WhatsApp) ====================

  // Get all notification providers
  app.get("/api/admin/notification-providers", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const providers = await db.select().from(notificationProviders);
      
      // Mask sensitive credentials
      const maskedProviders = providers.map(p => ({
        ...p,
        accountSid: p.accountSid ? "••••••••" + p.accountSid.slice(-4) : null,
        authToken: p.authToken ? "••••••••" + p.authToken.slice(-4) : null,
        apiKey: p.apiKey ? "••••••••" + p.apiKey.slice(-4) : null,
        sandboxAccountSid: p.sandboxAccountSid ? "••••••••" + p.sandboxAccountSid.slice(-4) : null,
        sandboxAuthToken: p.sandboxAuthToken ? "••••••••" + p.sandboxAuthToken.slice(-4) : null,
        sandboxApiKey: p.sandboxApiKey ? "••••••••" + p.sandboxApiKey.slice(-4) : null,
        hasAccountSid: !!p.accountSid,
        hasAuthToken: !!p.authToken,
        hasApiKey: !!p.apiKey,
        hasSandboxAccountSid: !!p.sandboxAccountSid,
        hasSandboxAuthToken: !!p.sandboxAuthToken,
        hasSandboxApiKey: !!p.sandboxApiKey,
      }));
      
      res.json(maskedProviders);
    } catch (error) {
      console.error("Error fetching notification providers:", error);
      res.status(500).json({ error: "Failed to fetch notification providers" });
    }
  });

  // Get single notification provider
  app.get("/api/admin/notification-providers/:provider", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { provider } = req.params;
      
      const [providerSettings] = await db.select()
        .from(notificationProviders)
        .where(eq(notificationProviders.providerName, provider));
      
      if (!providerSettings) {
        return res.status(404).json({ error: "Notification provider not found" });
      }
      
      // Mask sensitive credentials
      const maskedSettings = {
        ...providerSettings,
        accountSid: providerSettings.accountSid ? "••••••••" + providerSettings.accountSid.slice(-4) : null,
        authToken: providerSettings.authToken ? "••••••••" + providerSettings.authToken.slice(-4) : null,
        apiKey: providerSettings.apiKey ? "••••••••" + providerSettings.apiKey.slice(-4) : null,
        sandboxAccountSid: providerSettings.sandboxAccountSid ? "••••••••" + providerSettings.sandboxAccountSid.slice(-4) : null,
        sandboxAuthToken: providerSettings.sandboxAuthToken ? "••••••••" + providerSettings.sandboxAuthToken.slice(-4) : null,
        sandboxApiKey: providerSettings.sandboxApiKey ? "••••••••" + providerSettings.sandboxApiKey.slice(-4) : null,
        hasAccountSid: !!providerSettings.accountSid,
        hasAuthToken: !!providerSettings.authToken,
        hasApiKey: !!providerSettings.apiKey,
        hasSandboxAccountSid: !!providerSettings.sandboxAccountSid,
        hasSandboxAuthToken: !!providerSettings.sandboxAuthToken,
        hasSandboxApiKey: !!providerSettings.sandboxApiKey,
      };
      
      res.json(maskedSettings);
    } catch (error) {
      console.error("Error fetching notification provider:", error);
      res.status(500).json({ error: "Failed to fetch notification provider settings" });
    }
  });

  // Create or update notification provider
  app.put("/api/admin/notification-providers/:provider", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;
      const { 
        displayName,
        providerType,
        isActive, 
        mode, 
        accountSid,
        authToken, 
        apiKey,
        fromNumber,
        sandboxAccountSid,
        sandboxAuthToken,
        sandboxApiKey,
        sandboxFromNumber,
      } = req.body;
      
      // Check if provider exists
      const [existing] = await db.select()
        .from(notificationProviders)
        .where(eq(notificationProviders.providerName, provider));
      
      const updateData: any = {
        updatedBy: userId,
        updatedAt: new Date(),
      };
      
      if (displayName) updateData.displayName = displayName;
      if (providerType) updateData.providerType = providerType;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      if (mode && ["sandbox", "live"].includes(mode)) updateData.mode = mode;
      if (accountSid !== undefined && accountSid !== "") updateData.accountSid = accountSid;
      if (authToken !== undefined && authToken !== "") updateData.authToken = authToken;
      if (apiKey !== undefined && apiKey !== "") updateData.apiKey = apiKey;
      if (fromNumber !== undefined) updateData.fromNumber = fromNumber;
      if (sandboxAccountSid !== undefined && sandboxAccountSid !== "") updateData.sandboxAccountSid = sandboxAccountSid;
      if (sandboxAuthToken !== undefined && sandboxAuthToken !== "") updateData.sandboxAuthToken = sandboxAuthToken;
      if (sandboxApiKey !== undefined && sandboxApiKey !== "") updateData.sandboxApiKey = sandboxApiKey;
      if (sandboxFromNumber !== undefined) updateData.sandboxFromNumber = sandboxFromNumber;
      
      let result;
      if (existing) {
        [result] = await db.update(notificationProviders)
          .set(updateData)
          .where(eq(notificationProviders.providerName, provider))
          .returning();
      } else {
        [result] = await db.insert(notificationProviders)
          .values({
            providerName: provider,
            displayName: displayName || provider.charAt(0).toUpperCase() + provider.slice(1),
            providerType: providerType || "sms",
            ...updateData,
          })
          .returning();
      }
      
      res.json({ success: true, provider: result });
    } catch (error) {
      console.error("Error updating notification provider:", error);
      res.status(500).json({ error: "Failed to update notification provider settings" });
    }
  });

  // ==================== ADMIN: ROLES MANAGEMENT ====================

  // Get all roles
  app.get("/api/admin/roles", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Update role
  app.patch("/api/admin/roles/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { displayName, description, permissions, isActive } = req.body;
      
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (permissions) updateData.permissions = permissions;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      
      const [updated] = await db.update(roles)
        .set(updateData)
        .where(eq(roles.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Role not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Get users with their roles
  app.get("/api/admin/users-with-roles", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const usersWithRoles = await db.select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        activeRoleId: users.activeRoleId,
        createdAt: users.createdAt,
      }).from(users);
      
      // Get user roles for each user
      const usersWithRoleDetails = await Promise.all(usersWithRoles.map(async (user) => {
        const userRoleAssignments = await db.select({
          roleId: userRoles.roleId,
          roleName: roles.name,
          roleDisplayName: roles.displayName,
        })
        .from(userRoles)
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));
        
        return {
          ...user,
          roles: userRoleAssignments,
        };
      }));
      
      res.json(usersWithRoleDetails);
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      res.status(500).json({ error: "Failed to fetch users with roles" });
    }
  });

  // Assign role to user
  app.post("/api/admin/users/:userId/roles", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      
      if (!roleId) {
        return res.status(400).json({ error: "Role ID is required" });
      }
      
      // Check if assignment already exists
      const [existing] = await db.select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
      
      if (existing) {
        return res.status(400).json({ error: "User already has this role" });
      }
      
      const [assignment] = await db.insert(userRoles)
        .values({ userId, roleId })
        .returning();
      
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning role:", error);
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  // Remove role from user
  app.delete("/api/admin/users/:userId/roles/:roleId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      
      await db.delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing role:", error);
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  // Toggle user active status
  app.patch("/api/admin/users/:userId/status", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      const [updated] = await db.update(users)
        .set({ isActive })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Create new role
  app.post("/api/admin/roles", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, displayName, description, permissions: perms } = req.body;
      
      if (!name || !displayName) {
        return res.status(400).json({ error: "Name and display name are required" });
      }
      
      const slug = name.toLowerCase().replace(/\s+/g, '_');
      
      const [newRole] = await db.insert(roles)
        .values({
          name: slug,
          displayName,
          description: description || null,
          permissions: perms || [],
        })
        .returning();
      
      res.json(newRole);
    } catch (error: any) {
      console.error("Error creating role:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "A role with this name already exists" });
      }
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Delete role
  app.delete("/api/admin/roles/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if role is assigned to any users
      const assignments = await db.select().from(userRoles).where(eq(userRoles.roleId, id));
      if (assignments.length > 0) {
        return res.status(400).json({ error: "Cannot delete role that is assigned to users" });
      }
      
      await db.delete(roles).where(eq(roles.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // ==================== ADMIN: PERMISSIONS MANAGEMENT ====================

  // Get all permissions
  app.get("/api/admin/permissions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allPermissions = await db.select().from(permissions);
      res.json(allPermissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Create new permission
  app.post("/api/admin/permissions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, displayName, description, category } = req.body;
      
      if (!name || !displayName) {
        return res.status(400).json({ error: "Name and display name are required" });
      }
      
      const slug = name.toLowerCase().replace(/\s+/g, '_');
      
      const [newPermission] = await db.insert(permissions)
        .values({
          name: slug,
          displayName,
          description: description || null,
          category: category || 'general',
        })
        .returning();
      
      res.json(newPermission);
    } catch (error: any) {
      console.error("Error creating permission:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "A permission with this name already exists" });
      }
      res.status(500).json({ error: "Failed to create permission" });
    }
  });

  // Update permission
  app.patch("/api/admin/permissions/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { displayName, description, category, isActive } = req.body;
      
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (category) updateData.category = category;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      
      const [updated] = await db.update(permissions)
        .set(updateData)
        .where(eq(permissions.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Permission not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating permission:", error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  // Delete permission
  app.delete("/api/admin/permissions/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if permission is assigned to any roles
      const assignments = await db.select().from(rolePermissions).where(eq(rolePermissions.permissionId, id));
      if (assignments.length > 0) {
        return res.status(400).json({ error: "Cannot delete permission that is assigned to roles" });
      }
      
      await db.delete(permissions).where(eq(permissions.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ error: "Failed to delete permission" });
    }
  });

  // Get role permissions
  app.get("/api/admin/roles/:roleId/permissions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      
      const rolePerms = await db.select({
        id: rolePermissions.id,
        permissionId: rolePermissions.permissionId,
        permissionName: permissions.name,
        permissionDisplayName: permissions.displayName,
        category: permissions.category,
      })
      .from(rolePermissions)
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
      
      res.json(rolePerms);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Assign permission to role
  app.post("/api/admin/roles/:roleId/permissions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissionId } = req.body;
      
      if (!permissionId) {
        return res.status(400).json({ error: "Permission ID is required" });
      }
      
      // Check if assignment already exists
      const [existing] = await db.select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
      
      if (existing) {
        return res.status(400).json({ error: "Role already has this permission" });
      }
      
      const [assignment] = await db.insert(rolePermissions)
        .values({ roleId, permissionId })
        .returning();
      
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning permission:", error);
      res.status(500).json({ error: "Failed to assign permission" });
    }
  });

  // Remove permission from role
  app.delete("/api/admin/roles/:roleId/permissions/:permissionId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { roleId, permissionId } = req.params;
      
      await db.delete(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing permission:", error);
      res.status(500).json({ error: "Failed to remove permission" });
    }
  });

  // ==================== INSTAMOJO PAYMENT INTEGRATION ====================

  const BOOST_PRICES: Record<string, number> = {
    featured: 499,
    premium: 999,
    spotlight: 1499,
    urgent: 299,
  };

  // Create boost and initiate payment
  app.post("/api/boosts/create", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { propertyId, boostType } = req.body;

      if (!propertyId || !boostType) {
        return res.status(400).json({ error: "Property ID and boost type are required" });
      }

      // Verify property belongs to user
      const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ error: "Property not found or not owned by user" });
      }

      const amount = BOOST_PRICES[boostType];
      if (!amount) {
        return res.status(400).json({ error: "Invalid boost type" });
      }

      // Get user details
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check for Instamojo credentials
      const apiKey = process.env.INSTAMOJO_API_KEY;
      const authToken = process.env.INSTAMOJO_AUTH_TOKEN;
      const endpoint = process.env.INSTAMOJO_ENDPOINT || "https://test.instamojo.com";

      if (!apiKey || !authToken) {
        // For demo/dev: Create boost without payment gateway
        const [boost] = await db.insert(listingBoosts).values({
          propertyId,
          userId,
          boostType: boostType as any,
          amount: amount.toString(),
          status: "pending_approval" as any,
        }).returning();

        const [payment] = await db.insert(payments).values({
          userId,
          propertyId,
          boostId: boost.id,
          amount: amount.toString(),
          status: "completed",
          paymentMethod: "demo",
          description: `${boostType} boost for property`,
          paidAt: new Date(),
        }).returning();

        await db.update(listingBoosts)
          .set({ paymentId: payment.id })
          .where(eq(listingBoosts.id, boost.id));

        return res.json({
          success: true,
          boostId: boost.id,
          message: "Boost created (demo mode - payment gateway not configured)",
          demoMode: true,
        });
      }

      // Create boost record with pending_payment status
      const [boost] = await db.insert(listingBoosts).values({
        propertyId,
        userId,
        boostType: boostType as any,
        amount: amount.toString(),
        status: "pending_payment" as any,
      }).returning();

      // Create payment record
      const [payment] = await db.insert(payments).values({
        userId,
        propertyId,
        boostId: boost.id,
        amount: amount.toString(),
        status: "pending",
        paymentMethod: "instamojo",
        description: `${boostType} boost for property: ${property.title}`,
      }).returning();

      // Update boost with payment ID
      await db.update(listingBoosts)
        .set({ paymentId: payment.id })
        .where(eq(listingBoosts.id, boost.id));

      // Get redirect URL
      const host = req.get("host");
      const protocol = req.protocol;
      const redirectUrl = `${protocol}://${host}/api/boosts/payment-callback`;
      const webhookUrl = `${protocol}://${host}/api/boosts/webhook`;

      // Create Instamojo payment request
      const response = await fetch(`${endpoint}/api/1.1/payment-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Api-Key": apiKey,
          "X-Auth-Token": authToken,
        },
        body: new URLSearchParams({
          purpose: `Listing Boost: ${boostType}`,
          amount: amount.toString(),
          buyer_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || "User",
          email: user.email || "",
          phone: user.phone || "",
          redirect_url: redirectUrl,
          webhook: webhookUrl,
          allow_repeated_payments: "false",
          send_email: "true",
          send_sms: "true",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Instamojo error:", data);
        return res.status(500).json({ error: "Failed to create payment request" });
      }

      // Update payment with Instamojo request ID
      await db.update(payments)
        .set({ paymentRequestId: data.payment_request.id })
        .where(eq(payments.id, payment.id));

      res.json({
        success: true,
        boostId: boost.id,
        paymentId: payment.id,
        paymentUrl: data.payment_request.longurl,
      });
    } catch (error) {
      console.error("Error creating boost:", error);
      res.status(500).json({ error: "Failed to create boost" });
    }
  });

  // Payment callback (redirect after payment)
  app.get("/api/boosts/payment-callback", async (req, res) => {
    try {
      const { payment_id, payment_status, payment_request_id } = req.query;

      if (payment_status === "Credit") {
        // Payment successful - update records
        const [payment] = await db.select().from(payments)
          .where(eq(payments.paymentRequestId, payment_request_id as string));

        if (payment) {
          await db.update(payments).set({
            status: "completed",
            transactionId: payment_id as string,
            paidAt: new Date(),
          }).where(eq(payments.id, payment.id));

          if (payment.boostId) {
            await db.update(listingBoosts).set({
              status: "pending_approval" as any,
            }).where(eq(listingBoosts.id, payment.boostId));
          }
        }

        // Redirect to success page
        res.redirect("/dashboard?boost=success");
      } else {
        // Payment failed
        res.redirect("/dashboard?boost=failed");
      }
    } catch (error) {
      console.error("Payment callback error:", error);
      res.redirect("/dashboard?boost=error");
    }
  });

  // Instamojo webhook
  app.post("/api/boosts/webhook", async (req, res) => {
    try {
      const { payment_id, payment_request_id, status, amount } = req.body;

      if (status === "Credit") {
        const [payment] = await db.select().from(payments)
          .where(eq(payments.paymentRequestId, payment_request_id));

        if (payment) {
          await db.update(payments).set({
            status: "completed",
            transactionId: payment_id,
            paidAt: new Date(),
            gatewayResponse: req.body,
          }).where(eq(payments.id, payment.id));

          if (payment.boostId) {
            await db.update(listingBoosts).set({
              status: "pending_approval" as any,
            }).where(eq(listingBoosts.id, payment.boostId));
          }
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error processing webhook");
    }
  });

  // Get user's boosts
  app.get("/api/my-boosts", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;

      const boostsList = await db.select({
        id: listingBoosts.id,
        propertyId: listingBoosts.propertyId,
        boostType: listingBoosts.boostType,
        status: listingBoosts.status,
        amount: listingBoosts.amount,
        startDate: listingBoosts.startDate,
        endDate: listingBoosts.endDate,
        isActive: listingBoosts.isActive,
        impressions: listingBoosts.impressions,
        clicks: listingBoosts.clicks,
        createdAt: listingBoosts.createdAt,
        propertyTitle: properties.title,
      })
      .from(listingBoosts)
      .leftJoin(properties, eq(listingBoosts.propertyId, properties.id))
      .where(eq(listingBoosts.userId, userId))
      .orderBy(desc(listingBoosts.createdAt));

      res.json(boostsList);
    } catch (error) {
      console.error("Error fetching user boosts:", error);
      res.status(500).json({ error: "Failed to fetch boosts" });
    }
  });

  // ==================== NEWSLETTER SUBSCRIPTION ====================

  // Import newsletter table
  const { newsletterSubscribers } = await import("@shared/schema");

  // Public: Subscribe to newsletter
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, name, source } = req.body;
      
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      // Check if already subscribed
      const [existing] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email.toLowerCase().trim()));

      if (existing) {
        if (existing.isActive) {
          return res.status(200).json({ message: "Already subscribed", subscriber: existing });
        } else {
          // Reactivate subscription
          const [updated] = await db.update(newsletterSubscribers)
            .set({ isActive: true, unsubscribedAt: null })
            .where(eq(newsletterSubscribers.id, existing.id))
            .returning();
          return res.status(200).json({ message: "Subscription reactivated", subscriber: updated });
        }
      }

      const [subscriber] = await db.insert(newsletterSubscribers).values({
        email: email.toLowerCase().trim(),
        name: name || null,
        source: source || "website",
      }).returning();

      res.status(201).json({ message: "Successfully subscribed", subscriber });
    } catch (error) {
      console.error("Error subscribing:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Public: Unsubscribe from newsletter
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [updated] = await db.update(newsletterSubscribers)
        .set({ isActive: false, unsubscribedAt: new Date() })
        .where(eq(newsletterSubscribers.email, email.toLowerCase().trim()))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      res.json({ message: "Successfully unsubscribed" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Admin: Get all newsletter subscribers
  app.get("/api/admin/newsletter", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const subscribers = await db.select().from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.subscribedAt));
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  // Admin: Get newsletter stats
  app.get("/api/admin/newsletter/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [stats] = await db.select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where is_active = true)`,
        inactive: sql<number>`count(*) filter (where is_active = false)`,
      }).from(newsletterSubscribers);

      res.json(stats);
    } catch (error) {
      console.error("Error fetching newsletter stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin: Delete subscriber
  app.delete("/api/admin/newsletter/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [deleted] = await db.delete(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, req.params.id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ error: "Failed to delete subscriber" });
    }
  });

  // Admin: Toggle subscriber status
  app.patch("/api/admin/newsletter/:id/toggle", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [subscriber] = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, req.params.id));

      if (!subscriber) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      const [updated] = await db.update(newsletterSubscribers)
        .set({ 
          isActive: !subscriber.isActive,
          unsubscribedAt: subscriber.isActive ? new Date() : null 
        })
        .where(eq(newsletterSubscribers.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error toggling subscriber:", error);
      res.status(500).json({ error: "Failed to update subscriber" });
    }
  });

  // Admin: Export subscribers as CSV
  app.get("/api/admin/newsletter/export", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const subscribers = await db.select().from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.isActive, true))
        .orderBy(newsletterSubscribers.email);

      const csv = [
        "Email,Name,Subscribed At,Source",
        ...subscribers.map(s => 
          `${s.email},"${s.name || ""}",${s.subscribedAt?.toISOString() || ""},${s.source || ""}`
        )
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting subscribers:", error);
      res.status(500).json({ error: "Failed to export subscribers" });
    }
  });

  // ==================== ORGANIZATION SETTINGS ====================

  // Get organization settings
  app.get("/api/admin/organization", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const settings = await db.select().from(siteSettings)
        .where(sql`key LIKE 'org_%'`);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching organization settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Save organization settings
  app.post("/api/admin/organization", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const settings = req.body;
      
      for (const [key, value] of Object.entries(settings)) {
        await db.insert(siteSettings)
          .values({ key, value: value as string })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: value as string, updatedAt: new Date() }
          });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving organization settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // ==================== FOOTER SETTINGS ====================

  // Get footer settings (public - used by footer component)
  app.get("/api/footer-settings", async (req, res) => {
    try {
      const settings = await db.select().from(siteSettings)
        .where(sql`key LIKE 'footer_%'`);
      
      if (settings.length === 0) {
        // Return default settings
        return res.json({
          description: "Find your perfect rental property. We connect renters directly with property owners for a seamless experience.",
          address: "Pune, Maharashtra, India",
          phone: "+91 1234567890",
          email: "support@leaseo.in",
          copyrightText: "2024 Leaseo. All rights reserved.",
          companyLinks: [
            { label: "About Us", href: "/about" },
            { label: "Careers", href: "#" },
            { label: "Press", href: "#" },
            { label: "Blog", href: "#" },
          ],
          supportLinks: [
            { label: "Help Center", href: "#" },
            { label: "Safety Information", href: "#" },
            { label: "Cancellation Options", href: "#" },
            { label: "Report a Concern", href: "#" },
          ],
          legalLinks: [
            { label: "Terms of Service", href: "#" },
            { label: "Privacy Policy", href: "#" },
            { label: "Cookie Policy", href: "#" },
            { label: "Accessibility", href: "#" },
          ],
        });
      }
      
      // Convert settings array to object
      const footerData: any = {};
      for (const s of settings) {
        const key = s.key.replace('footer_', '');
        const value = s.value || '';
        try {
          footerData[key] = JSON.parse(value);
        } catch {
          footerData[key] = value;
        }
      }
      
      res.json(footerData);
    } catch (error) {
      console.error("Error fetching footer settings:", error);
      res.status(500).json({ error: "Failed to fetch footer settings" });
    }
  });

  // Save footer settings (admin only)
  app.post("/api/admin/footer-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const footerData = req.body;
      
      for (const [key, value] of Object.entries(footerData)) {
        const dbKey = `footer_${key}`;
        const dbValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        await db.insert(siteSettings)
          .values({ key: dbKey, value: dbValue })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: dbValue, updatedAt: new Date() }
          });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving footer settings:", error);
      res.status(500).json({ error: "Failed to save footer settings" });
    }
  });

  // ==================== CSV IMPORT ====================

  // Download sample CSV template
  app.get("/api/admin/properties/sample-csv", authMiddleware, adminMiddleware, (req, res) => {
    const sampleCSV = `title,description,propertyType,listingType,isCommercial,rent,deposit,address,city,state,bedrooms,bathrooms,squareFeet,amenities,isFeatured
"Modern 2BHK Apartment","Spacious apartment with balcony and modern amenities. Located near metro station.","apartment","rent",false,25000,50000,"123 Main Street, Koregaon Park","Pune","Maharashtra",2,2,1200,"parking,gym,security",false
"Commercial Office Space","Prime office space in business district with 24/7 access.","office","rent",true,75000,150000,"Business Tower, Hinjewadi","Pune","Maharashtra",0,2,2500,"parking,elevator,security,ac",false
"3BHK Villa for Rent","Beautiful villa with garden, perfect for families.","villa","rent",false,45000,90000,"Palm Meadows, Whitefield","Bangalore","Karnataka",3,3,2800,"parking,garden,security,gym",true`;
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=property-import-template.csv");
    res.send(sampleCSV);
  });

  // Import properties from CSV
  app.post("/api/admin/properties/import-csv", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { csvData, ownerId } = req.body;
      
      if (!csvData || !ownerId) {
        return res.status(400).json({ error: "CSV data and owner ID are required" });
      }

      const lines = csvData.split("\n").filter((line: string) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have header and at least one data row" });
      }

      const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          const row: any = {};
          headers.forEach((header: string, idx: number) => {
            row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
          });

          const rentValue = parseInt(row.rent) || 0;
          
          await db.insert(properties).values({
            title: row.title || "Untitled Property",
            description: row.description || "No description",
            propertyType: row.propertyType || "apartment",
            listingType: row.listingType || "rent",
            isCommercial: row.isCommercial === "true",
            price: String(rentValue),
            rent: String(rentValue),
            securityDeposit: String(parseInt(row.deposit) || 0),
            address: row.address || "Address not specified",
            city: row.city || "Unknown",
            state: row.state || "Unknown",
            cityId: row.cityId || null,
            localityId: row.localityId || null,
            bedrooms: parseInt(row.bedrooms) || 0,
            bathrooms: String(parseInt(row.bathrooms) || 0),
            squareFeet: parseInt(row.squareFeet) || null,
            amenities: row.amenities ? row.amenities.split(",").map((a: string) => a.trim()) : [],
            isFeatured: row.isFeatured === "true",
            ownerId,
            status: "active",
          });

          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing properties:", error);
      res.status(500).json({ error: "Failed to import properties" });
    }
  });

  return httpServer;
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}
