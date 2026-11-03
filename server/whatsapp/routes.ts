import type { Express, RequestHandler } from "express";
import {
  normalizePhone, parseDeliveryEvents, secretMatches,
  sendTemplateMessage, verifyWebhookSignature, WhatsAppError,
  type DeliveryEvent,
} from "./core.ts";
import {
  encryptionReady, parseSettingsUpdate, safeSettings, SettingsValidationError,
  type LoadedSettings, type WhatsAppEnvironment,
} from "./settings.ts";

type Dependencies = {
  authenticate: RequestHandler;
  requireAdmin: RequestHandler;
  saveEvents: (events: DeliveryEvent[]) => Promise<void>;
  listEvents: () => Promise<unknown[]>;
  logger: { error: (message: string) => void };
  environment?: Record<string, string | undefined>;
  send?: typeof sendTemplateMessage;
  loadSettings?: () => Promise<LoadedSettings>;
  persistSettings?: (env: WhatsAppEnvironment) => Promise<LoadedSettings>;
};

export function registerWhatsAppRoutes(app: Express, deps: Dependencies) {
  const baseEnv = deps.environment ?? process.env;
  const loadSettings = deps.loadSettings ?? (async () => ({
    environment: baseEnv, source: "environment" as const, updatedAt: null,
  }));
  const send = deps.send ?? sendTemplateMessage;
  const admin = [deps.authenticate, deps.requireAdmin];
  // One manual test per minute per process; only a server-configured test number.
  let nextTestAt = 0;

  const respondError = (res: any, error: unknown) => {
    if (error instanceof SettingsValidationError) {
      return res.status(400).json({ error: error.code, missing: error.missing, invalid: error.invalid });
    }
    if (error instanceof WhatsAppError) return res.status(error.httpStatus).json({ error: error.code, retryable: error.retryable });
    return res.status(503).json({ error: "WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE" });
  };

  app.get("/api/admin/whatsapp/status", ...admin, async (_req, res) => {
    try {
      const loaded = await loadSettings();
      return res.json(safeSettings(loaded, baseEnv).status);
    } catch (error) { return respondError(res, error); }
  });

  app.get("/api/admin/whatsapp/settings", ...admin, async (_req, res) => {
    try { return res.json(safeSettings(await loadSettings(), baseEnv)); }
    catch (error) { return respondError(res, error); }
  });

  app.put("/api/admin/whatsapp/settings", ...admin, async (req, res) => {
    try {
      if (!encryptionReady(baseEnv)) throw new WhatsAppError("WHATSAPP_ENCRYPTION_KEY_REQUIRED", 503);
      if (!deps.persistSettings) throw new WhatsAppError("WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE", 503);
      const previous = await loadSettings();
      const next = parseSettingsUpdate(req.body, previous.environment);
      const saved = await deps.persistSettings(next);
      return res.json(safeSettings(saved, baseEnv));
    } catch (error) { return respondError(res, error); }
  });

  app.get("/api/whatsapp/webhook", async (req, res) => {
    let env: WhatsAppEnvironment;
    try { env = (await loadSettings()).environment; }
    catch (error) { return respondError(res, error); }
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
    let env: WhatsAppEnvironment;
    try { env = (await loadSettings()).environment; }
    catch (error) { return respondError(res, error); }
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
    try {
      const env = (await loadSettings()).environment;
      const recipient = env.WHATSAPP_TEST_RECIPIENT;
      if (!recipient) return res.status(503).json({ error: "WHATSAPP_TEST_RECIPIENT_NOT_CONFIGURED" });
      const bodyParameters = req.body.bodyParameters;
      if (bodyParameters !== undefined &&
          (!Array.isArray(bodyParameters) || bodyParameters.length > 30 ||
           bodyParameters.some((p: unknown) => typeof p !== "string" || !p.trim() || p.length > 1024))) {
        throw new WhatsAppError("INVALID_TEMPLATE_PARAMETERS");
      }
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
        ...(bodyParameters?.length ? { bodyParameters } : {}),
      }, env);
      return res.status(202).json(result);
    } catch (error) {
      return respondError(res, error);
    }
  });
}
