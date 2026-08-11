import { config } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';
import { registerAuthProvider } from 'app/features/auth-config';
import { type AuthProviderInfo, type AuthProviderStatus } from 'app/features/auth-config/types';
import { AccessControlAction } from 'app/types/accessControl';

import { isDefaultSAMLConfig } from './SAML/utils';
import { getSAMLSettings } from './SAML/utils/api';
import { getSettings } from './SCIM/utils/api';

// Export SCIM components
;

export function initAuthConfig() {
  const samlAuthProvider: AuthProviderInfo = {
    id: 'saml',
    type: 'SAML',
    protocol: 'SAML 2.0',
    displayName: 'SAML',
    configPath: 'saml/general',
  };
  registerAuthProvider(samlAuthProvider, getSAMLConfigHook);
}

export function initSCIM() {
  const scimAuthProvider: AuthProviderInfo = {
    id: 'scim',
    type: 'SCIM',
    protocol: 'SCIM 2.0',
    displayName: 'SCIM',
    configPath: 'scim',
  };
  registerAuthProvider(scimAuthProvider, getSCIMConfigHook);
}

async function getSAMLConfigHook(): Promise<AuthProviderStatus> {
  if (contextSrv.hasPermission(AccessControlAction.SettingsRead)) {
    // TODO: might want to put this into a state
    const [samlSettings, rawSettings] = await getSAMLSettings();
    const isDefault = isDefaultSAMLConfig(rawSettings);

    // hidden when the api does not contain a valid response, this means the user doesn't have permission to see it
    const hide = Object.keys(samlSettings).length === 0 || Object.keys(rawSettings).length === 0;

    if (isDefault) {
      return { configured: false, enabled: false, hide };
    } else {
      return {
        configured: true,
        enabled: !!samlSettings.enabled,
        name: samlSettings.name,
        hide,
      };
    }
  }

  return { configured: false, enabled: false };
}

async function getSCIMConfigHook(): Promise<AuthProviderStatus> {
  if (contextSrv.hasPermission(AccessControlAction.SettingsRead) && config.featureToggles.enableSCIM) {
    try {
      const scimSettings = await getSettings();

      // SCIM is enabled if either user sync or group sync is enabled
      const isEnabled = scimSettings.userSyncEnabled || scimSettings.groupSyncEnabled;

      return {
        configured: isEnabled,
        enabled: isEnabled,
        hide: false,
      };
    } catch (error) {
      // If there's an error fetching settings, assume SCIM is not configured
      return {
        configured: false,
        enabled: false,
        hide: false,
      };
    }
  }

  return { configured: false, enabled: false, hide: true };
}
