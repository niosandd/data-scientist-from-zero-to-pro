export const SCIM_CONFIG_SOURCE = {
  DATABASE: 'database',
  FILE: 'file',
} as const;

export type SCIMConfigSource = (typeof SCIM_CONFIG_SOURCE)[keyof typeof SCIM_CONFIG_SOURCE];
