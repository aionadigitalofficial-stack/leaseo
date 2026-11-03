import type { Express, RequestHandler } from "express";
import {
  configurationStatus, normalizePhone, parseDeliveryEvents, secretMatches,
  sendTemplateMessage, verifyWebhookSignature, WhatsAppError,
  type DeliveryEvent,
} from "./core.ts";

type Dependencies = {
  authenticate: RequestHandler;
  requireAdmin: RequestHandler;
  saveEvents: (events: DeliveryEvent[]) => Promise<void>;
  listEvents: () => Promise<unknown[]>;
  logger: { error: (message: string) => void };
  environment?: Record<string, string | undefined>;
  send?: typeof sendTemplateMessage;
};

export function registerWhatsAppRoutes(app: Express, deps: Dependencies) {
  const env = deps.environment ?? process.env;
  const send = deps.send ?? sendTemplateMessage;
  const admin = [deps.authenticate, deps.requireAdmin];
  // One manual test per minute per process; only a server-configured test number.
  let nextTestAt = 0;

  app.get("/api/admin/whatsapp/status", ...admin, (_req, res) => {
    res.json(configurationStatus(env));
  });

  app.get("/api/whatsapp/webhook", (req, res) => {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expected = env.WHATSAPP_VERIFY_TOKEN || "";
    if (!expected) return res.status(503).json({ error: "WHATSAPP_WEBHOOK_NOT_CONFIGURED" });
    if (req.query["hub.mode"] !== "subscribe" || typeof token !== "string" ||
        typeof challenge !== "string" || challenge.length > 1024 ||
        !secretMatches(token, expected)) {
      return res.sendStatus(403);
    }
    return res.status(200).type("text/plain").send(challenge);
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    if (!env.WHATSAPP_APP_SECRET || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return res.status(503).json({ error: "WHATSAPP_WEBHOOK_NOT_CONFIGURED" });
    }
    // server/index.ts already captures the exact bytes in express.json.verify.
    if (!Buffer.isBuffer(req.rawBody) ||
        !verifyWebhookSignature(req.rawBody, req.get("x-hub-signature-256"), env.WHATSAPP_APP_SECRET)) {
      return res.sendStatus(403);
    }
    try {
      const events = parseDeliveryEvents(req.body, env.WHATSAPP_PHONE_NUMBER_ID, env.WHATSAPP_BUSINESS_ACCOUNT_ID);
      // Persist before ACK. DB failures return 503 so Meta retries; duplicates are safe.
      if (events.length) await deps.saveEvents(events);
      return res.sendStatus(200);
    } catch (error) {
      if (error instanceof WhatsAppError) return res.status(400).json({ error: error.code });
      deps.logger.error("[WhatsApp] Delivery event persistence failed; webhook will be retried.");
      return res.status(503).json({ error: "WHATSAPP_EVENT_STORAGE_UNAVAILABLE" });
    }
  });

  app.get("/api/admin/whatsapp/delivery-events", ...admin, async (_req, res) => {
    try {
      return res.json({ events: await deps.listEvents() });
    } catch {
      return res.status(503).json({ error: "WHATSAPP_EVENT_STORAGE_UNAVAILABLE" });
    }
  });

  app.post("/api/admin/whatsapp/test", ...admin, async (req, res) => {
    if (req.body?.consentConfirmed !== true) {
      return res.status(400).json({ error: "WHATSAPP_OPT_IN_REQUIRED" });
    }
    const recipient = env.WHATSAPP_TEST_RECIPIENT;
    if (!recipient) return res.status(503).json({ error: "WHATSAPP_TEST_RECIPIENT_NOT_CONFIGURED" });
    try {
      normalizePhone(recipient);
      if (Date.now() < nextTestAt) {
        res.setHeader("Retry-After", Math.ceil((nextTestAt - Date.now()) / 1000));
        return res.status(429).json({ error: "WHATSAPP_TEST_RATE_LIMITED" });
      }
      nextTestAt = Date.now() + 60_000;
      const result = await send({
        to: recipient,
        templateName: env.WHATSAPP_TEST_TEMPLATE || "hello_world",
        languageCode: env.WHATSAPP_TEST_LANGUAGE || "en_US",
        consentConfirmed: true,
      }, env);
      return res.status(202).json(result);
    } catch (error) {
      if (error instanceof WhatsAppError) {
        return res.status(error.httpStatus).json({ error: error.code, retryable: error.retryable });
      }
      return res.status(500).json({ error: "WHATSAPP_TEST_FAILED" });
    }
  });
}
