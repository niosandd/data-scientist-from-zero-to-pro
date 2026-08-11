import { css } from '@emotion/css';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Field, Switch, useStyles2 } from '@grafana/ui';

import { type SCIMFormData, type SCIMSettingsData } from '../../../types';

const getStyles = (theme: GrafanaTheme2) => ({
  toggleSwitchesContainer: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing(4),
    width: '100%',
    alignItems: 'start',
  }),
  fieldInGrid: css({
    marginBottom: 0,
  }),
  section: css({
    marginBottom: theme.spacing(4),
  }),
});

interface Props {
  scimSettings: SCIMSettingsData;
  onSettingsChange: (data: SCIMFormData) => void;
  disabled?: boolean;
}

export const SCIMSettingsForm = ({ scimSettings, onSettingsChange, disabled = false }: Props) => {
  const styles = useStyles2(getStyles);
  const previousSettingsRef = useRef<SCIMSettingsData>(scimSettings);

  const {
    register,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<SCIMFormData>({
    mode: 'onBlur',
    defaultValues: {
      userSyncEnabled: scimSettings.userSyncEnabled ?? false,
      groupSyncEnabled: scimSettings.groupSyncEnabled ?? false,
      rejectNonProvisionedUsers: scimSettings.rejectNonProvisionedUsers ?? false,
    },
  });

  // Update form values when scimSettings prop changes, but only if they actually changed
  useEffect(() => {
    const currentSettings = {
      userSyncEnabled: scimSettings.userSyncEnabled ?? false,
      groupSyncEnabled: scimSettings.groupSyncEnabled ?? false,
      rejectNonProvisionedUsers: scimSettings.rejectNonProvisionedUsers ?? false,
    };

    const previousSettings = {
      userSyncEnabled: previousSettingsRef.current.userSyncEnabled ?? false,
      groupSyncEnabled: previousSettingsRef.current.groupSyncEnabled ?? false,
      rejectNonProvisionedUsers: previousSettingsRef.current.rejectNonProvisionedUsers ?? false,
    };

    // Only reset if the settings actually changed and we're not in the middle of a user interaction
    if (
      !isDirty &&
      (currentSettings.userSyncEnabled !== previousSettings.userSyncEnabled ||
        currentSettings.groupSyncEnabled !== previousSettings.groupSyncEnabled ||
        currentSettings.rejectNonProvisionedUsers !== previousSettings.rejectNonProvisionedUsers)
    ) {
      reset(currentSettings);
    }

    // Update the ref with current settings
    previousSettingsRef.current = scimSettings;
  }, [scimSettings, reset, isDirty]);

  // Watch for changes and call parent callback
  const watchedValues = watch(['userSyncEnabled', 'groupSyncEnabled', 'rejectNonProvisionedUsers']);

  useEffect(() => {
    if (isDirty && watchedValues.every((val) => val !== undefined)) {
      const [userSyncEnabled, groupSyncEnabled, rejectNonProvisionedUsers] = watchedValues;
      onSettingsChange({
        userSyncEnabled: userSyncEnabled,
        groupSyncEnabled: groupSyncEnabled,
        rejectNonProvisionedUsers,
      });
    }
  }, [watchedValues, isDirty, onSettingsChange]);

  return (
    <div className={styles.section}>
      <div className={styles.toggleSwitchesContainer}>
        <Field
          label={t('scim.config.userSyncEnabled', 'Enable User Sync')}
          description={t(
            'scim.config.userSyncEnabledDescription',
            'Allow your Identity Provider to create, update, and delete users in your Grafana Cloud stack through SCIM.'
          )}
          className={styles.fieldInGrid}
        >
          <Switch {...register('userSyncEnabled')} id="userSyncEnabled" disabled={disabled} />
        </Field>

        <Field
          label={t('scim.config.groupSyncEnabled', 'Enable Group Sync')}
          description={t(
            'scim.config.groupSyncEnabledDescription',
            'Allow your Identity Provider to create, update, and delete teams in your Grafana Cloud stack through SCIM. Cannot be enabled if Team Sync is enabled.'
          )}
          className={styles.fieldInGrid}
        >
          <Switch {...register('groupSyncEnabled')} id="groupSyncEnabled" disabled={disabled} />
        </Field>

        <Field
          label={t('scim.config.rejectNonProvisionedUsers', 'Reject Non-Provisioned Users')}
          description={t(
            'scim.config.rejectNonProvisionedUsersDescription',
            'When enabled, prevents non-SCIM provisioned users from signing in. Cloud Portal users can always sign in regardless of this setting.'
          )}
          className={styles.fieldInGrid}
        >
          <Switch {...register('rejectNonProvisionedUsers')} id="rejectNonProvisionedUsers" disabled={disabled} />
        </Field>
      </div>
    </div>
  );
};
