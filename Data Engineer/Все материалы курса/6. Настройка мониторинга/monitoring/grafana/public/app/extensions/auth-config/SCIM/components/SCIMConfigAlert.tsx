import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Alert, Box, Button, Stack, Text, useStyles2 } from '@grafana/ui';

import { type SCIMSettingsData } from '../../../types';
import { SCIM_CONFIG_SOURCE } from '../constants';

const getStyles = (theme: GrafanaTheme2) => ({
  section: css({
    marginBottom: theme.spacing(4),
  }),
});

interface Props {
  scimSettings: SCIMSettingsData;
  onResetClick: () => void;
  isResetting: boolean;
}

export const SCIMConfigAlert = ({ scimSettings, onResetClick, isResetting }: Props) => {
  const styles = useStyles2(getStyles);

  if (scimSettings.source !== SCIM_CONFIG_SOURCE.DATABASE || config.namespace.startsWith('stacks-')) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Alert severity="info" title={t('scim.config.scimSettingsInfo', 'Configuration File Contains SCIM Settings')}>
        <Stack direction="column" gap={2}>
          <Text variant="bodySmall">
            <Trans i18nKey="scim.config.scimSettingsDescription">
              Your configuration file contains SCIM settings. You can update them on this page, or revert to use the
              settings from your configuration file.
            </Trans>
          </Text>
          <Box display="flex" justifyContent="flex-start">
            <Button variant="destructive" size="sm" onClick={onResetClick} icon="trash-alt" disabled={isResetting}>
              {isResetting
                ? t('scim.config.resetting', 'Resetting...')
                : t('scim.config.resetToIniSettings', 'Revert to use configuration file settings')}
            </Button>
          </Box>
        </Stack>
      </Alert>
    </div>
  );
};
