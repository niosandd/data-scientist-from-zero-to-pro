import { css } from '@emotion/css';
import { useState, useEffect, useCallback, type JSX } from 'react';
import { connect, type ConnectedProps } from 'react-redux';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Alert, Modal, Stack, Text, Button, useStyles2, TextLink } from '@grafana/ui';
import { extractErrorMessage } from 'app/api/utils';
import { Page } from 'app/core/components/Page/Page';
import { useAppNotification } from 'app/core/copy/appNotification';
import { type GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { AppNotificationSeverity } from 'app/types/appNotifications';
import { useDispatch } from 'app/types/store';

import { type EnterpriseStoreState } from '../../types';
import { type SCIMFormData } from '../../types/scimConfig';

import { SCIMConfigAlert } from './components/SCIMConfigAlert';
import { SCIMInfoCards } from './components/SCIMInfoCards';
import { SCIMSettingsForm } from './components/SCIMSettingsForm';
import { SCIMSetupGuide } from './components/SCIMSetupGuide';
import { loadSCIMSettings, saveSCIMSettingsDebounced, resetSCIMSettings } from './state/actions';
import { resetError } from './state/reducers';
import { getDomain, getBaseUrl, getStackId } from './utils/api';
import { logError, logInfo, logMeasurement } from './utils/logger';

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    marginBottom: theme.spacing(4),
  }),
  description: css({
    marginBottom: theme.spacing(3),
    color: theme.colors.text.secondary,
  }),
  tokenModal: css({
    width: 600,
  }),
});

const mapStateToProps = (state: EnterpriseStoreState) => {
  return {
    scimConfig: state.scimConfig || {
      scimSettings: {},
      isLoading: false,
      error: null,
      isUpdated: false,
    },
  };
};

const connector = connect(mapStateToProps);
export type Props = ConnectedProps<typeof connector>;

export const SetupSCIMPageUnconnected = ({ scimConfig }: Props): JSX.Element => {
  const dispatch = useDispatch();
  const styles = useStyles2(getStyles);
  const notifyApp = useAppNotification();

  // Local state for non-Redux data
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [stackId, setStackId] = useState<string>('Loading...');

  // Extract Redux state
  const { scimSettings, isLoading, error, isUpdated } = scimConfig;

  // Derived values
  const domainInfo = getDomain();
  const [baseUrl, setBaseUrl] = useState<string>('');

  // Load stack ID
  const loadStackId = useCallback(async () => {
    const startTime = performance.now();

    try {
      const id = getStackId();
      setStackId(id);

      logMeasurement(
        'scimStackIdLoad',
        {
          duration: performance.now() - startTime,
          loadTimeMs: performance.now() - startTime,
        },
        {
          method: 'GET',
          endpoint: 'stackId',
          success: 'true',
        }
      );

      logInfo('Stack ID loaded successfully', { stackId: id });
    } catch (error) {
      const errorMessage = extractErrorMessage(error, t('scim.config.loadStackIdUnknownError', 'Unknown error'));
      logError(new Error('Failed to load stack ID'), { error: errorMessage });
      setStackId('Error loading stack ID');
    }
  }, []);

  // Load tenant URL
  const loadBaseUrl = useCallback(async () => {
    const startTime = performance.now();

    try {
      const url = await getBaseUrl();
      setBaseUrl(url);

      logMeasurement(
        'scimBaseUrlLoad',
        {
          duration: performance.now() - startTime,
          loadTimeMs: performance.now() - startTime,
        },
        {
          method: 'GET',
          endpoint: 'baseUrl',
          success: 'true',
        }
      );

      logInfo('Base URL loaded successfully', { baseUrl: url });
    } catch (error) {
      const errorMessage = extractErrorMessage(error, t('scim.config.loadBaseUrlUnknownError', 'Unknown error'));
      logError(new Error('Failed to load base URL'), { error: errorMessage });
      setBaseUrl('Failed to load base URL');
    }
  }, []);

  // Handlers
  const handleSettingsChange = useCallback(
    (data: SCIMFormData) => {
      dispatch(saveSCIMSettingsDebounced(data));
    },
    [dispatch]
  );

  const handleResetClick = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    setIsResetting(true);
    setShowResetModal(false);
    try {
      await dispatch(resetSCIMSettings());
    } catch (error) {
      const errorMessage = extractErrorMessage(error, t('scim.config.resetScimSettingsUnknownError', 'Unknown error'));
      logError(new Error('Failed to reset SCIM settings'), { error: errorMessage });
    } finally {
      setIsResetting(false);
    }
  }, [dispatch]);

  const handleErrorDismiss = useCallback(() => {
    dispatch(resetError());
  }, [dispatch]);

  useEffect(() => {
    if (isUpdated) {
      notifyApp.success(
        t('scim.config.settingsUpdatedTitle', 'Settings Updated'),
        t('scim.config.settingsUpdated', 'SCIM settings have been successfully updated.')
      );
    }
  }, [isUpdated, notifyApp]);

  useEffect(() => {
    if (config.featureToggles.enableSCIM) {
      dispatch(loadSCIMSettings());
      loadStackId();
      loadBaseUrl();
    }
  }, [dispatch, loadStackId, loadBaseUrl]);

  // Check if SCIM feature is enabled
  if (!config.featureToggles.enableSCIM) {
    return (
      <Page navId="scim">
        <Page.Contents>
          <Alert severity="warning" title={t('scim.featureDisabled.title', 'SCIM Feature Disabled')}>
            <Trans i18nKey="scim.featureDisabled.message">
              The SCIM feature is not enabled. Please enable the <code>enableSCIM</code> feature toggle in your
              configuration to use SCIM functionality.
            </Trans>
          </Alert>
        </Page.Contents>
      </Page>
    );
  }

  return (
    <Page
      navId="authentication"
      pageNav={{
        text: 'SCIM Configuration',
        subTitle:
          'Configure SCIM (System for Cross-domain Identity Management) to enable automatic user and group provisioning from your Identity Provider. SCIM allows your IdP to create, update, and delete users and groups in your Grafana Cloud stack automatically.',
      }}
    >
      <TextLink
        href="https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-scim-provisioning/"
        external
      >
        <Trans i18nKey="scim.config.readMoreLink">Read more about SCIM provisioning</Trans>
      </TextLink>
      <Page.Contents isLoading={isLoading}>
        <div className={styles.wrapper}>
          {/* Error Display */}
          {error && (
            <Alert severity={AppNotificationSeverity.Error} title={error.message} onRemove={handleErrorDismiss}>
              {error.errors && error.errors.length > 0 && (
                <ul>
                  {error.errors.map((err: string, index: number) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}

          {/* Information Cards */}
          <SCIMInfoCards domainInfo={domainInfo} stackId={stackId} />

          {/* Warn if configuration file settings exist*/}
          <SCIMConfigAlert scimSettings={scimSettings} onResetClick={handleResetClick} isResetting={isResetting} />

          {/* SCIM Settings Form */}
          <SCIMSettingsForm scimSettings={scimSettings} onSettingsChange={handleSettingsChange} disabled={isLoading} />

          {/* Tenant URL and Service Account Instructions */}
          <SCIMSetupGuide tenantUrl={baseUrl} />
        </div>
      </Page.Contents>

      {/* Reset Configuration Modal */}
      <Modal
        isOpen={showResetModal}
        title={t('scim.config.resetConfiguration', 'Reset SCIM Configuration')}
        onDismiss={() => setShowResetModal(false)}
        className={styles.tokenModal}
      >
        <Stack direction="column" gap={3}>
          <Text>
            <Trans i18nKey="scim.config.resetConfirmation">
              Are you sure you want to reset the SCIM configuration? This will delete all dynamic SCIM settings and fall
              back to the configuration file settings.
            </Trans>
          </Text>
          <Text variant="bodySmall" color="secondary">
            <Trans i18nKey="scim.config.resetWarning">
              This action cannot be undone. After resetting, Grafana will use the SCIM settings from your config.ini
              file.
            </Trans>
          </Text>
          <Stack direction="row" gap={2} justifyContent="flex-end">
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleResetConfirm} disabled={isResetting}>
              {isResetting
                ? t('scim.config.resetting', 'Resetting...')
                : t('scim.config.confirmReset', 'Reset Configuration')}
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </Page>
  );
};

const SetupSCIMPage = connector(SetupSCIMPageUnconnected);

// Wrapper component that accepts route props
const SetupSCIMPageWrapper = (props: GrafanaRouteComponentProps) => {
  return <SetupSCIMPage />;
};

export default SetupSCIMPageWrapper;
