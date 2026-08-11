import { debounce } from 'lodash';

import { t } from '@grafana/i18n';
import { extractErrorMessage } from 'app/api/utils';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';
import { type ThunkResult } from 'app/types/store';

import { type SCIMFormData } from '../../../types';
import { getSettings, updateSettings, deleteSettings } from '../utils/api';
import { logInfo, logError, logWarning, logMeasurement } from '../utils/logger';

import {
  settingsLoaded,
  settingsLoadingBegin,
  settingsLoadingEnd,
  resetError,
  setError,
  setIsUpdated,
  settingsUpdated,
} from './reducers';

export function loadSCIMSettings(): ThunkResult<void> {
  return async (dispatch) => {
    if (contextSrv.hasPermission(AccessControlAction.SettingsRead)) {
      const startTime = performance.now();
      dispatch(settingsLoadingBegin());

      try {
        // Load SCIM settings and create default config if missing
        const scimSettings = await getSettings();
        dispatch(settingsLoaded(scimSettings));

        logMeasurement(
          'scimSettingsLoad',
          {
            duration: performance.now() - startTime,
            loadTimeMs: performance.now() - startTime,
          },
          {
            method: 'GET',
            endpoint: 'settings',
            success: 'true',
          }
        );

        logInfo('SCIM settings loaded successfully', {
          source: scimSettings.source,
          userSyncEnabled: String(scimSettings.userSyncEnabled),
          groupSyncEnabled: String(scimSettings.groupSyncEnabled),
        });
      } catch (error) {
        const errorMessage = extractErrorMessage(error, t('scim.config.loadScimSettingsUnknownError', 'Unknown error'));
        dispatch(settingsLoadingEnd());
        dispatch(
          setError({
            message: 'Failed to load SCIM settings',
            errors: [errorMessage],
          })
        );

        logError(new Error('Failed to load SCIM settings'), { error: errorMessage });
      }
    } else {
      logWarning('Access denied for loading SCIM settings', {
        permission: 'SettingsRead',
        action: 'loadSCIMSettings',
      });
    }
  };
}

// Debounced version of save to prevent too many API calls
const debouncedSaveSCIMSettings = debounce(
  (dispatch: any, formData: SCIMFormData) => {
    dispatch(saveSCIMSettings(formData));
  },
  500 // 500ms debounce
);

export function saveSCIMSettingsDebounced(formData: SCIMFormData): ThunkResult<void> {
  return (dispatch) => {
    debouncedSaveSCIMSettings(dispatch, formData);
  };
}

export function saveSCIMSettings(formData: SCIMFormData): ThunkResult<void> {
  return async (dispatch) => {
    if (!contextSrv.hasPermission(AccessControlAction.SettingsWrite)) {
      logWarning('Access denied for saving SCIM settings', {
        permission: 'SettingsWrite',
        action: 'saveSCIMSettings',
      });
      return;
    }

    const startTime = performance.now();
    dispatch(resetError());
    dispatch(settingsLoadingBegin());

    try {
      const updated = await updateSettings(formData);
      if (updated) {
        // Update the Redux state with the new settings
        const updatedSettings = await getSettings();
        dispatch(settingsUpdated(updatedSettings));
        dispatch(setIsUpdated(true));
        // Clear the updated flag after a short delay
        setTimeout(() => {
          dispatch(setIsUpdated(false));
        }, 3000);

        logMeasurement(
          'scimSettingsSave',
          {
            duration: performance.now() - startTime,
            loadTimeMs: performance.now() - startTime,
          },
          {
            method: 'PUT',
            endpoint: 'settings',
            success: 'true',
            userSyncEnabled: String(formData.userSyncEnabled),
            groupSyncEnabled: String(formData.groupSyncEnabled),
          }
        );

        logInfo('SCIM settings saved successfully', {
          userSyncEnabled: String(formData.userSyncEnabled),
          groupSyncEnabled: String(formData.groupSyncEnabled),
          rejectNonProvisionedUsers: String(formData.rejectNonProvisionedUsers),
        });
      }
      dispatch(settingsLoadingEnd());
    } catch (error) {
      const errorMessage = extractErrorMessage(error, t('scim.config.updateScimSettingsUnknownError', 'Unknown error'));
      dispatch(settingsLoadingEnd());
      dispatch(
        setError({
          message: 'Failed to update SCIM settings',
          errors: [errorMessage],
        })
      );

      logError(new Error('Failed to update SCIM settings'), {
        error: errorMessage,
        userSyncEnabled: String(formData.userSyncEnabled),
        groupSyncEnabled: String(formData.groupSyncEnabled),
        rejectNonProvisionedUsers: String(formData.rejectNonProvisionedUsers),
      });
    }
  };
}

export function resetSCIMSettings(): ThunkResult<void> {
  return async (dispatch) => {
    if (!contextSrv.hasPermission(AccessControlAction.SettingsWrite)) {
      logWarning('Access denied for resetting SCIM settings', {
        permission: 'SettingsWrite',
        action: 'resetSCIMSettings',
      });
      return;
    }

    const startTime = performance.now();

    try {
      dispatch(settingsLoadingBegin());
      await deleteSettings();

      logMeasurement(
        'scimSettingsReset',
        {
          duration: performance.now() - startTime,
          loadTimeMs: performance.now() - startTime,
        },
        {
          method: 'DELETE',
          endpoint: 'settings',
          success: 'true',
        }
      );

      logInfo('SCIM settings reset successfully');

      const scimSettings = await getSettings();
      dispatch(settingsLoaded(scimSettings));
      dispatch(setIsUpdated(true));
      setTimeout(() => {
        dispatch(setIsUpdated(false));
      }, 5000);
      dispatch(settingsLoadingEnd());
    } catch (error) {
      const errorMessage = extractErrorMessage(error, t('scim.config.resetScimSettingsUnknownError', 'Unknown error'));
      dispatch(settingsLoadingEnd());
      dispatch(
        setError({
          message: 'Failed to reset SCIM configuration',
          errors: [errorMessage],
        })
      );

      logError(new Error('Failed to reset SCIM configuration'), { error: errorMessage });
    }
  };
}
