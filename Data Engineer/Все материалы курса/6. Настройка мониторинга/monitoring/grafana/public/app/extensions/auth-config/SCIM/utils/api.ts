import { t } from '@grafana/i18n';
import { config, getBackendSrv } from '@grafana/runtime';
import { extractErrorMessage } from 'app/api/utils';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { type SCIMFormData, type SCIMSettingsData, type SCIMUser } from '../../../types';

import { logInfo, logError, logMeasurement } from './logger';

// SCIM API constants
const SCIM_API_GROUP = 'scim.grafana.app';
const SCIM_API_VERSION = 'v0alpha1';

// Error messages
const ERROR_MESSAGES = {
  ACCESS_DENIED: 'Access denied',
  CONFIG_FETCH_FAILED: 'Failed to fetch SCIM configuration',
  CONFIG_UPDATE_FAILED: 'Failed to update SCIM configuration',
  CONFIG_RESET_FAILED: 'Failed to reset SCIM configuration',
  USERS_FETCH_FAILED: 'Failed to fetch SCIM users',
} as const;

/**
 * Get the SCIM config endpoint URL with proper namespace
 * @returns string - The SCIM config endpoint URL
 */
function getConfigUrl(): string {
  const namespace = config.namespace;
  return `/apis/scim.grafana.app/v0alpha1/namespaces/${namespace}/config/default`;
}

/**
 * Update SCIM settings with the provided form data
 * @param formData - The SCIM configuration data to update
 * @returns Promise<boolean> - True if successful, throws error if failed
 */
export async function updateSettings(formData: SCIMFormData): Promise<boolean> {
  if (!contextSrv.hasPermission(AccessControlAction.SettingsWrite)) {
    throw new Error(ERROR_MESSAGES.ACCESS_DENIED);
  }

  const startTime = performance.now();

  try {
    const configUrl = getConfigUrl();
    const currentConfig = await getBackendSrv().get(configUrl);

    // Update the config with the new form data
    const updatedConfig = {
      ...currentConfig,
      spec: {
        ...currentConfig.spec,
        enableUserSync: formData.userSyncEnabled,
        enableGroupSync: formData.groupSyncEnabled,
        rejectNonProvisionedUsers: formData.rejectNonProvisionedUsers,
      },
    };

    await getBackendSrv().put(configUrl, updatedConfig);

    logMeasurement(
      'scimConfigUpdate',
      {
        duration: performance.now() - startTime,
        loadTimeMs: performance.now() - startTime,
      },
      {
        method: 'PUT',
        endpoint: 'config',
        userSyncEnabled: String(formData.userSyncEnabled),
        groupSyncEnabled: String(formData.groupSyncEnabled),
      }
    );

    logInfo('SCIM configuration updated successfully', {
      userSyncEnabled: String(formData.userSyncEnabled),
      groupSyncEnabled: String(formData.groupSyncEnabled),
      rejectNonProvisionedUsers: String(formData.rejectNonProvisionedUsers),
    });

    return true;
  } catch (error) {
    const errorMessage = extractErrorMessage(error, t('scim.config.updateScimSettingsUnknownError', 'Unknown error'));
    logError(new Error(ERROR_MESSAGES.CONFIG_UPDATE_FAILED), {
      error: errorMessage,
      userSyncEnabled: String(formData.userSyncEnabled),
      groupSyncEnabled: String(formData.groupSyncEnabled),
      rejectNonProvisionedUsers: String(formData.rejectNonProvisionedUsers),
    });
    throw new Error(`${ERROR_MESSAGES.CONFIG_UPDATE_FAILED}: ${errorMessage}`);
  }
}

/**
 * Fetch SCIM settings from the API, with fallback to static config
 * If dynamic config doesn't exist, attempts to create it with static config values
 * @returns Promise<SCIMSettingsData> - The SCIM settings data
 */
export async function getSettings(): Promise<SCIMSettingsData> {
  if (!contextSrv.hasPermission(AccessControlAction.SettingsRead)) {
    throw new Error(ERROR_MESSAGES.ACCESS_DENIED);
  }

  const startTime = performance.now();
  const configUrl = getConfigUrl();

  try {
    const config = await getBackendSrv().get(configUrl, undefined, undefined, {
      showErrorAlert: false,
    });

    const result = {
      userSyncEnabled: config.spec?.enableUserSync ?? false,
      groupSyncEnabled: config.spec?.enableGroupSync ?? false,
      rejectNonProvisionedUsers: config.spec?.rejectNonProvisionedUsers ?? false,
      source: config.status?.source ?? 'file',
    };

    logMeasurement(
      'scimConfigFetch',
      {
        duration: performance.now() - startTime,
        loadTimeMs: performance.now() - startTime,
      },
      {
        method: 'GET',
        endpoint: 'config',
        source: result.source,
      }
    );
    logInfo('SCIM settings loaded successfully', {
      source: result.source,
      userSyncEnabled: String(result.userSyncEnabled),
      groupSyncEnabled: String(result.groupSyncEnabled),
    });

    return result;
  } catch (error) {
    const errorMessage = extractErrorMessage(error, t('scim.config.loadScimSettingsUnknownError', 'Unknown error'));
    logError(new Error(ERROR_MESSAGES.CONFIG_FETCH_FAILED), { error: errorMessage });
    throw new Error(`${ERROR_MESSAGES.CONFIG_FETCH_FAILED}: ${errorMessage}`);
  }
}

/**
 * Fetch SCIM provisioned users
 * @returns Promise<SCIMUser[]> - Array of SCIM provisioned users
 */
export async function fetchSCIMUsers(): Promise<SCIMUser[]> {
  const startTime = performance.now();

  try {
    const result = await getBackendSrv().get('/api/users/search?perpage=1000&isProvisioned=true');
    const users = result.users || [];

    logMeasurement(
      'scimUsersFetch',
      {
        duration: performance.now() - startTime,
        loadTimeMs: performance.now() - startTime,
      },
      {
        method: 'GET',
        endpoint: 'users',
        userCount: users.length,
      }
    );

    logInfo('Fetched SCIM users', { userCount: users.length });

    return users;
  } catch (error) {
    const errorMessage = extractErrorMessage(error, t('scim.config.fetchScimUsersUnknownError', 'Unknown error'));
    logError(new Error(ERROR_MESSAGES.USERS_FETCH_FAILED), { error: errorMessage });
    throw new Error(`${ERROR_MESSAGES.USERS_FETCH_FAILED}: ${errorMessage}`);
  }
}

/**
 * Reset SCIM configuration by deleting the dynamic config
 * @returns Promise<void>
 */
export async function deleteSettings(): Promise<void> {
  const startTime = performance.now();

  try {
    const configUrl = getConfigUrl();
    await getBackendSrv().delete(configUrl);

    logMeasurement(
      'scimConfigReset',
      {
        duration: performance.now() - startTime,
        loadTimeMs: performance.now() - startTime,
      },
      {
        method: 'DELETE',
        endpoint: 'config',
      }
    );

    logInfo('SCIM configuration reset successfully');
  } catch (error) {
    const errorMessage = extractErrorMessage(error, t('scim.config.deleteScimSettingsUnknownError', 'Unknown error'));
    logError(new Error(ERROR_MESSAGES.CONFIG_RESET_FAILED), { error: errorMessage });
    throw new Error(`${ERROR_MESSAGES.CONFIG_RESET_FAILED}: ${errorMessage}`);
  }
}

/**
 * Get domain information for the current Grafana instance
 * @returns Object with domain and subdomain information
 */
export function getDomain() {
  const baseUrl = config.appSubUrl || window.location.origin;
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return { domain: 'localhost', subdomain: 'local' };
  }

  const url = new URL(baseUrl);
  const hostname = url.hostname;
  const parts = hostname.split('.');

  if (parts.length >= 3 && hostname.endsWith('.grafana.net')) {
    return { domain: hostname, subdomain: parts[0] };
  }

  return { domain: hostname, subdomain: 'unknown' };
}

/**
 * Get the base URL for SCIM operations
 * @returns Promise<string> - The base URL with proper namespace
 */
export async function getBaseUrl(): Promise<string> {
  const baseUrl = config.appSubUrl || window.location.origin;
  const namespace = config.namespace;

  // If namespace is in stacks format, use it directly
  if (namespace.startsWith('stacks-')) {
    return `${baseUrl}/apis/${SCIM_API_GROUP}/${SCIM_API_VERSION}/namespaces/${namespace}`;
  }

  // For default namespace, try to get stack ID from settings
  if (namespace === 'default') {
    try {
      const settings = await getBackendSrv().get('/api/admin/settings');
      if (settings && settings.environment && settings.environment.stack_id) {
        return `${baseUrl}/apis/${SCIM_API_GROUP}/${SCIM_API_VERSION}/namespaces/stacks-${settings.environment.stack_id}`;
      }
    } catch (error) {
      // Fallback to default namespace
    }
  }

  // For other namespaces, use as-is
  return `${baseUrl}/apis/${SCIM_API_GROUP}/${SCIM_API_VERSION}/namespaces/${namespace}`;
}

/**
 * Get stack ID for display purposes
 * @returns string - The stack ID or appropriate fallback message
 */
export function getStackId(): string {
  // Extract stack ID from namespace if it follows the stacks-{id} pattern
  const namespace = config.namespace;
  if (namespace.startsWith('stacks-')) {
    return namespace.replace('stacks-', '');
  }

  // For other namespaces, return the namespace itself
  return namespace;
}
