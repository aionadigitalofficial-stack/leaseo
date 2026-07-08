import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

/**
 * Register object storage routes.
 *
 * NOTE: this module used to also register `POST /api/uploads/request-url`,
 * but that path is already registered by server/local-storage.ts (which is
 * called first in server/routes.ts), so Express always used the
 * local-storage version and this one was silently dead code - while still
 * being a second, unauthenticated implementation of the same endpoint that
 * would have become live again if registration order ever changed. It has
 * been removed. Only the object-serving route remains, kept so any images
 * uploaded back when this ran on Replit's object storage keep working.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

