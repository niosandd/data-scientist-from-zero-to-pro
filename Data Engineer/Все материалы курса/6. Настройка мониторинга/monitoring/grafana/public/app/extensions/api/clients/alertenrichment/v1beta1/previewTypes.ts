import type { AlertEnrichmentSpec } from './endpoints.gen';

/**
 * One alert in the notification payload (e.g. from notification history).
 * Matches the shape used by the preview backend / enrichment service.
 */
export interface NotificationAlert {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  [key: string]: unknown;
}

/** Request body for POST .../enricher/preview */
export interface PreviewEnrichmentRequestBody {
  /** Enrichment spec (steps, matchers, etc.) to run. */
  enrichmentSpec: AlertEnrichmentSpec;
  /** Alert list from a historic notification (e.g. from useNotificationAlerts). */
  notificationPayload: NotificationAlert[];
}

/**
 * Response from the preview endpoint. Backend proxies the enrichment service response;
 * shape is service-defined (e.g. enriched payload or error details).
 */
export interface PreviewEnrichmentResponse {
  [key: string]: unknown;
}
