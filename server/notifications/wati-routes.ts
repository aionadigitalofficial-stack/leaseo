import type { Express, Request, Response } from "express";
import { pool } from "../db";
import { authMiddleware, adminMiddleware } from "../auth";
import { ContactError } from "./core";
import { loadWati, saveWati, safeWati, watiSecret } from "./wati-store";
import { sameSecret, watiEvent } from "./wati-core";

const handle = (fn: (req: Request, res: Response) => Promise<any>) => (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  Promise.resolve(fn(req, res)).catch((e: any) => res.status(e instanceof ContactError ? e.status : 503).json({
    error: e instanceof ContactError ? e.code : e?.code === "42P01" ? "WATI_MIGRATION_REQUIRED" : "WATI_STORAGE_UNAVAILABLE",
  }));
};
export function registerWatiRoutes(app: Express) {
  const path = "/api/admin/notifications/wati";
  app.get(path, authMiddleware, adminMiddleware, handle(async (_req, res) => res.json(safeWati(await loadWati()))));
  app.put(path, authMiddleware, adminMiddleware, handle(async (req, res) => res.json(await saveWati(req.body))));
  // Reveal callback URL only on an explicit authenticated administrator action.
  app.post(`${path}/webhook-url`, authMiddleware, adminMiddleware, handle(async (_req, res) => {
    const row = await loadWati();
    res.json({ path: `/api/notifications/wati/webhook?key=${watiSecret(row.encrypted_webhook_secret)}` });
  }));
  app.post("/api/notifications/wati/webhook", handle(async (req, res) => {
    const row = await loadWati();
    if (!sameSecret(req.query.key, watiSecret(row.encrypted_webhook_secret))) throw new ContactError("WATI_WEBHOOK_UNAUTHORIZED", 403);
    const e = watiEvent(req.body, row.channel);
    if (e) await pool.query(`INSERT INTO wati_notification_events
      (event_key,local_id,wati_message_id,whatsapp_message_id,channel,status,error_code,api_host)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [`${row.api_host}:${e.key}`,e.local,e.wati,e.whatsapp,e.channel,e.status,e.error,row.api_host]);
    res.json({ received: true });
  }));
}
