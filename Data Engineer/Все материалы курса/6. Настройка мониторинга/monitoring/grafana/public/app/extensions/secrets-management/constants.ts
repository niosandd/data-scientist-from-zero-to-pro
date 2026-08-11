/**
 * When updating this map, please update the Grafana docs to reflect the changes.
 * @link https://github.com/grafana/grafana/blob/5fd4fb5fb83097da37d1bfc0b4803ce2456fdf43/docs/sources/developer-resources/api-reference/http-api/secrets_management.md?plain=1#L44-L51
 */
export const DECRYPT_ALLOW_LIST_LABEL_MAP: Record<string, string> = {
  'synthetic-monitoring': 'Synthetic Monitoring',
  'k6-cloud': 'K6 Cloud',
};

export const DECRYPT_ALLOW_LIST_OPTIONS = Object.entries(DECRYPT_ALLOW_LIST_LABEL_MAP).map(([value, label]) => {
  return { label, value };
});

export const SUBDOMAIN_MAX_LENGTH = 253;
export const LABEL_MAX_LENGTH = 63;
export const SECRETS_MAX_LABELS = 10;
export const SECURE_VALUE_MAX_LENGTH = 24576; // 24 KiB
