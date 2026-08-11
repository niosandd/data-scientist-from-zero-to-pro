import { css } from '@emotion/css';
import { useMemo, type JSX } from 'react';

import { type GrafanaTheme2, type NavModelItem } from '@grafana/data';
import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Alert, Button, EmptyState, LinkButton, useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';

import { KeeperCard } from './components/KeeperCard';
import { SECRETS_KEEPER_NEW_URL, SYSTEM_KEEPER_NAME } from './constants';
import { useActivateFlow } from './hooks/useActivateFlow';
import { useKeepers } from './hooks/useKeepers';

export const SecretsKeeper = (): JSX.Element => {
  const { keepers, isLoading, error, activeKeeper } = useKeepers();
  const styles = useStyles2(getStyles);

  const pageNav: NavModelItem = useMemo(
    () => ({
      text: t('secrets.page-title', 'Secrets'),
      children: [
        {
          text: t('secrets.tabs.values', 'Values'),
          url: '/admin/secrets/secure-values',
          active: false,
        },
        // Only show Keepers tab if feature flag is enabled
        ...(config.featureToggles.secretsKeeperUI
          ? [
              {
                text: t('secrets.tabs.keepers', 'Keepers'),
                url: '/admin/secrets/keepers',
                active: true,
              },
            ]
          : []),
      ],
    }),
    []
  );

  const activeKeeperText = activeKeeper
    ? t('secrets-keeper.home.active-keeper', 'Active keeper: {{name}} ({{type}})', {
        name: activeKeeper.name,
        type: activeKeeper.type,
      })
    : t('secrets-keeper.home.active-keeper-default', 'Active keeper: System (GSM)');

  // Fallback to SYSTEM_KEEPER_NAME so a stale render between the user's click
  // and modal Confirm cannot send activate('') to the BE — worst case becomes
  // a no-op activate of the system keeper rather than a confusing error toast.
  // The `canRevert` gate hides the button in normal flow.
  const revertFlow = useActivateFlow({
    name: activeKeeper?.name ?? SYSTEM_KEEPER_NAME,
    isActive: true,
  });
  const canRevert = Boolean(activeKeeper) && activeKeeper?.name !== SYSTEM_KEEPER_NAME;

  const header = (
    <div className={styles.header}>
      <div className={styles.activeBlock}>
        <div className={styles.activeInfo} aria-live="polite" aria-atomic="true">
          {activeKeeperText}
        </div>
        {canRevert && revertFlow.hasPermission && (
          <Button
            variant="secondary"
            fill="outline"
            size="sm"
            onClick={revertFlow.onClick}
            data-testid="revert-to-system-button"
          >
            {t('secrets-keeper.home.revert-to-system', 'Revert to System Keeper')}
          </Button>
        )}
      </div>
      <LinkButton href={SECRETS_KEEPER_NEW_URL} icon="plus" variant="primary">
        {t('secrets-keeper.home.add-keeper', 'Add keeper')}
      </LinkButton>
    </div>
  );

  const errorState = (
    <Alert title={t('secrets-keeper.home.error-title', 'Error loading keepers')}>{error?.message}</Alert>
  );

  const emptyStateDescription = t(
    'secrets-keeper.home.empty-state',
    'Secrets keepers allow you to store Grafana secrets in external services like AWS Secrets Manager.'
  );

  const emptyState = (
    <EmptyState
      variant="call-to-action"
      message={t('secrets-keeper.home.empty-title', 'No keepers configured')}
      button={
        <LinkButton href={SECRETS_KEEPER_NEW_URL} icon="plus">
          {t('secrets-keeper.home.add-first-keeper', 'Add your first keeper')}
        </LinkButton>
      }
    >
      {emptyStateDescription}
    </EmptyState>
  );

  const keepersList = (
    <div className={styles.list}>
      {keepers.map((keeper) => (
        <KeeperCard key={keeper.name} keeper={keeper} />
      ))}
    </div>
  );

  return (
    <Page
      navId="secrets-management"
      pageNav={pageNav}
      subTitle={t('secrets-keeper.home.subtitle', 'Manage external secrets storage for Grafana')}
    >
      <Page.Contents isLoading={isLoading}>
        {header}
        {canRevert && revertFlow.modal}
        {error && errorState}
        {!isLoading && !error && keepers.length === 0 && emptyState}
        {keepers.length > 0 && keepersList}
      </Page.Contents>
    </Page>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  header: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2),
  }),
  activeBlock: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    // ~20px between the active-keeper note and the Revert button per design.
    gap: theme.spacing(2.5),
  }),
  activeInfo: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
  list: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  }),
});

export default SecretsKeeper;
