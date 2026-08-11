import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { Box, ClipboardButton, Input, Stack, Text, TextLink, useStyles2 } from '@grafana/ui';

const getStyles = (theme: GrafanaTheme2) => ({
  section: css({
    marginBottom: theme.spacing(6),
  }),
  inputWithCopyToClipboard: css({
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
  }),
  copyToClipboardButton: css({
    height: 32,
  }),
});

interface Props {
  tenantUrl: string;
}

export const SCIMSetupGuide = ({ tenantUrl }: Props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.section}>
      <Stack direction="column" gap={4}>
        <Stack direction="column" gap={1}>
          <Text variant="h3">{t('scim.config.tenantUrl', 'Tenant URL')}</Text>
          <Text color="secondary">
            {t(
              'scim.config.tenantUrlDescription',
              "The tenant URL for your Identity Provider configuration. This is the base URL that your IdP will use to connect to your Grafana Cloud stack's SCIM API."
            )}
          </Text>
          <div className={styles.inputWithCopyToClipboard}>
            <Input id="scimApiEndpoint" width={50} value={tenantUrl} readOnly />
            <ClipboardButton
              className={styles.copyToClipboardButton}
              variant="primary"
              size="md"
              icon="copy"
              getText={() => tenantUrl}
            >
              {t('scim.config.copy', 'Copy')}
            </ClipboardButton>
          </div>
        </Stack>

        <Stack direction="column" gap={1}>
          <Text variant="h3">
            {t('scim.config.serviceAccountToken', 'How to create a service account & token for SCIM')}
          </Text>
          <Text color="secondary">
            {t(
              'scim.config.serviceAccountTokenDescription',
              'This service account token will be used by your Identity Provider to provision users and groups in your Grafana Cloud stack.'
            )}
          </Text>
          <Box padding={3} backgroundColor="secondary" borderRadius="default" borderColor="weak" borderStyle="solid">
            <Stack direction="column" gap={1}>
              <Stack direction="column" gap={1}>
                <Text variant="h5" weight="medium">
                  <Trans i18nKey="scim.config.step1">1. Create Service Account</Trans>
                </Text>
                <ol style={{ margin: 0, paddingLeft: '24px' }}>
                  <li>
                    <Trans i18nKey="scim.config.goToServiceAccounts">
                      Go to{' '}
                      <TextLink href="/org/serviceaccounts/create" style={{ textDecoration: 'underline' }}>
                        Service accounts
                      </TextLink>
                    </Trans>
                  </li>
                  <li>
                    <Trans i18nKey="scim.config.addServiceAccount">Click &quot;Add service account&quot;</Trans>
                  </li>
                  <li>
                    <Trans i18nKey="scim.config.createWithNone">
                      Create a service account with Role: &quot;None&quot;
                    </Trans>
                  </li>
                </ol>
              </Stack>

              <Stack direction="column" gap={1}>
                <Text variant="h5" weight="medium">
                  <Trans i18nKey="scim.config.step2">2. Add Permissions</Trans>
                </Text>
                <div style={{ paddingLeft: '24px' }}>
                  <Text>
                    <Trans i18nKey="scim.config.goToPermissionsTab">
                      In the service account Permissions tab, add these permissions:
                    </Trans>
                  </Text>
                </div>
                <div style={{ paddingLeft: '24px' }}>
                  <Text>
                    <Trans i18nKey="scim.config.userSyncPermissions">Allow the service account to sync users:</Trans>
                  </Text>
                  <Box
                    padding={1}
                    backgroundColor="primary"
                    borderRadius="default"
                    borderColor="weak"
                    borderStyle="solid"
                    marginBottom={2}
                  >
                    <ul style={{ margin: 0, paddingLeft: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
                      <li>
                        <Trans i18nKey="scim.config.permission1">org.users:read</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission2">org.users:write</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission3">org.users:add</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission4">org.users:remove</Trans>
                      </li>
                    </ul>
                  </Box>

                  <Text>
                    <Trans i18nKey="scim.config.groupSyncPermissions">Allow the service account to sync groups:</Trans>
                  </Text>
                  <Box
                    padding={1}
                    backgroundColor="primary"
                    borderRadius="default"
                    borderColor="weak"
                    borderStyle="solid"
                  >
                    <ul style={{ margin: 0, paddingLeft: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
                      <li>
                        <Trans i18nKey="scim.config.permission5">teams:read</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission6">teams:create</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission7">teams:write</Trans>
                      </li>
                      <li>
                        <Trans i18nKey="scim.config.permission8">teams:delete</Trans>
                      </li>
                    </ul>
                  </Box>
                </div>
              </Stack>

              <Stack direction="column" gap={1}>
                <Text variant="h5" weight="medium">
                  <Trans i18nKey="scim.config.step3">3. Generate Token</Trans>
                </Text>
                <ol style={{ margin: 0, paddingLeft: '24px' }}>
                  <li>
                    <Trans i18nKey="scim.config.addToken">Click &quot;Add token&quot;</Trans>
                  </li>
                  <li>
                    <Trans i18nKey="scim.config.copyToken">Copy the token for your Identity Provider</Trans>
                  </li>
                </ol>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </div>
  );
};
