import type { Express } from "express";
import { eq, and } from "drizzle-orm";
import { otpRequests, refreshTokens, roles, userRoles, users } from "@shared/schema";
import { adminMiddleware, authMiddleware } from "./auth";
import { db } from "./db";

const linkedAccountMessage = "This user has linked records and cannot be deleted. Deactivate the account instead.";

export function registerAdminUserDeletion(app: Express) {
  app.delete("/api/admin/login-users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    const id = req.params.id;
    if (id === req.user?.id) return res.status(403).json({ error: "You cannot delete your own account." });

    try {
      const result = await db.transaction(async (tx) => {
        const [target] = await tx.select({ activeRoleId: users.activeRoleId })
          .from(users).where(eq(users.id, id)).for("update");
        if (!target) return "missing";

        const [adminRole] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, "admin"));
        if (adminRole) {
          const [assignment] = await tx.select({ id: userRoles.id }).from(userRoles)
            .where(and(eq(userRoles.userId, id), eq(userRoles.roleId, adminRole.id)));
          if (assignment || target.activeRoleId === adminRole.id) return "protected";
        }

        // Only clean up access credentials and role membership. Business and
        // history records retain their foreign keys; a reference blocks the
        // account DELETE and rolls back all three cleanup statements.
        await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
        await tx.delete(otpRequests).where(eq(otpRequests.userId, id));
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        await tx.delete(users).where(eq(users.id, id));
        return "deleted";
      });

      if (result === "missing") return res.status(404).json({ error: "User not found." });
      if (result === "protected") return res.status(403).json({ error: "Admin accounts cannot be deleted here." });
      return res.json({ success: true });
    } catch (error) {
      const pgError = error as { code?: unknown; cause?: { code?: unknown } } | null;
      if (pgError?.code === "23503" || pgError?.cause?.code === "23503") {
        return res.status(409).json({ error: linkedAccountMessage });
      }
      console.error("[admin-users] Account deletion failed.");
      return res.status(500).json({ error: "Could not delete the user." });
    }
  });
}
