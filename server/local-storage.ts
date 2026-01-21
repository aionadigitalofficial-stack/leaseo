import { Router, Request, Response } from "express";
import multer, { StorageEngine, FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authMiddleware } from "./auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PUBLIC_DIR = path.join(UPLOAD_DIR, "public");
const PRIVATE_DIR = path.join(UPLOAD_DIR, "private");

// Ensure upload directories exist
[PUBLIC_DIR, PRIVATE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sanitize filename to prevent directory traversal attacks
function sanitizeFilename(filename: string): string | null {
  // Remove any path separators and parent directory references
  const sanitized = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Reject if empty or starts with a dot (hidden files)
  if (!sanitized || sanitized.startsWith(".") || sanitized.length > 255) {
    return null;
  }
  
  return sanitized;
}

// Validate that a path is within the allowed directory
function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

// Configure multer for file uploads
const storageConfig: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const isPrivate = req.query.private === "true";
    cb(null, isPrivate ? PRIVATE_DIR : PUBLIC_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    // Only allow safe extensions
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];
    if (!allowedExtensions.includes(ext)) {
      cb(new Error("Invalid file extension"), "");
      return;
    }
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
    cb(null, `${baseName}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and PDFs are allowed."));
    }
  },
});

export function registerLocalStorageRoutes(app: Router): void {
  // Upload file endpoint - REQUIRES AUTHENTICATION
  app.post("/api/upload", authMiddleware, upload.single("file"), (req: Request, res: Response): void => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const isPrivate = req.query.private === "true";
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      const relativePath = isPrivate 
        ? `/uploads/private/${file.filename}`
        : `/uploads/public/${file.filename}`;
      
      res.json({
        success: true,
        url: `${baseUrl}${relativePath}`,
        path: relativePath,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Upload multiple files - REQUIRES AUTHENTICATION
  app.post("/api/upload/multiple", authMiddleware, upload.array("files", 10), (req: Request, res: Response): void => {
    try {
      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const isPrivate = req.query.private === "true";
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

      const uploadedFiles = files.map((file: Express.Multer.File) => {
        const relativePath = isPrivate 
          ? `/uploads/private/${file.filename}`
          : `/uploads/public/${file.filename}`;
        
        return {
          url: `${baseUrl}${relativePath}`,
          path: relativePath,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };
      });

      res.json({ success: true, files: uploadedFiles });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Delete file endpoint - REQUIRES AUTHENTICATION with path traversal protection
  app.delete("/api/upload/:filename", authMiddleware, (req: Request, res: Response): void => {
    try {
      const { filename } = req.params;
      
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = sanitizeFilename(filename);
      if (!sanitizedFilename) {
        res.status(400).json({ error: "Invalid filename" });
        return;
      }
      
      const isPrivate = req.query.private === "true";
      const targetDir = isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
      const filePath = path.join(targetDir, sanitizedFilename);
      
      // Verify the resolved path is within the target directory
      if (!isPathWithinDirectory(filePath, targetDir)) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "File deleted" });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Get presigned URL for upload (compatibility with Replit object storage API)
  // REQUIRES AUTHENTICATION
  app.post("/api/object-storage/presigned-url", authMiddleware, (req: Request, res: Response): void => {
    try {
      const { isPublic } = req.body;
      
      // For local storage, we just return the upload endpoint
      const uploadUrl = `/api/upload${isPublic ? "" : "?private=true"}`;
      
      res.json({
        success: true,
        uploadUrl,
        method: "POST",
        formField: "file",
        message: "Use multipart form data to upload",
      });
    } catch (error) {
      console.error("Presigned URL error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Request URL for upload - compatible with useUpload hook
  // This endpoint returns a direct upload URL that works with FormData
  // Note: No auth required here to match Replit object storage behavior
  app.post("/api/uploads/request-url", async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, size, contentType } = req.body;
      
      if (!name) {
        res.status(400).json({ error: "Missing required field: name" });
        return;
      }

      // Generate unique filename
      const uniqueSuffix = crypto.randomBytes(8).toString("hex");
      const ext = path.extname(name).toLowerCase();
      const baseName = path.basename(name, ext).replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
      const filename = `${baseName}_${uniqueSuffix}${ext}`;
      
      // For local storage, upload URL points to our upload endpoint
      const baseUrl = process.env.BASE_URL || "";
      const uploadURL = `${baseUrl}/api/upload/direct?filename=${encodeURIComponent(filename)}`;
      const objectPath = `/uploads/public/${filename}`;

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Request URL error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Direct file upload with PUT method (for presigned URL flow compatibility)
  // Note: No auth required since URL contains the unique filename
  app.put("/api/upload/direct", (req: Request, res: Response): void => {
    const filename = req.query.filename as string;
    
    if (!filename) {
      res.status(400).json({ error: "Missing filename" });
      return;
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(filename);
    if (!sanitizedFilename) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }

    const filePath = path.join(PUBLIC_DIR, sanitizedFilename);
    
    // Verify path is within allowed directory
    if (!isPathWithinDirectory(filePath, PUBLIC_DIR)) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    // Stream the request body directly to file
    const writeStream = fs.createWriteStream(filePath);
    
    req.pipe(writeStream);
    
    writeStream.on("finish", () => {
      res.status(200).json({ success: true });
    });
    
    writeStream.on("error", (err) => {
      console.error("Write error:", err);
      res.status(500).json({ error: "Failed to save file" });
    });
  });
}

export { UPLOAD_DIR, PUBLIC_DIR, PRIVATE_DIR };
