import { createHash } from "node:crypto";
import { pool } from "../db";
import type { DeliveryEvent } from "./core.ts";

export async function saveDeliveryEvents(events: DeliveryEvent[]): Promise<void> {
  const rows = events.map(event => ({
    event_key: createHash("sha256")
      .update(JSON.stringify([event.messageId, event.status, event.eventTimestamp]))
      .digest("hex"),
    message_id: event.messageId,
    status: event.status,
    event_timestamp: event.eventTimestamp,
    error_code: event.errorCode,
  }));
  await pool.query(
    `INSERT INTO whatsapp_delivery_events (event_key, message_id, status, event_timestamp, error_code)
     SELECT event_key, message_id, status, event_timestamp::bigint, error_code
     FROM jsonb_to_recordset($1::jsonb)
       AS e(event_key text, message_id text, status text, event_timestamp text, error_code integer)
     ON CONFLICT (event_key) DO NOTHING`,
    [JSON.stringify(rows)],
  );
}

export async function listDeliveryEvents(): Promise<unknown[]> {
  const result = await pool.query(
    `SELECT message_id AS "messageId", status, event_timestamp::text AS "eventTimestamp",
            error_code AS "errorCode", received_at AS "receivedAt"
     FROM whatsapp_delivery_events
     ORDER BY event_timestamp DESC, received_at DESC LIMIT 50`,
  );
  return result.rows;
}
