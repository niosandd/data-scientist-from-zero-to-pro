import { css } from '@emotion/css';
import { useCallback, useMemo, useState } from 'react';

import { type GrafanaTheme2, type NavModelItem } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Box, Button, EmptyState, FilterInput, InlineField, TextLink, useStyles2, Text } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { PageContents } from 'app/core/components/Page/PageContents';
import { contextSrv } from 'app/core/services/context_srv';
import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';
import { AccessControlAction } from 'app/extensions/types';

import { EditSecretModal } from './components/EditSecretModal';
import { SecretsList } from './components/SecretsList';
import { getErrorMessage } from './utils';

export default function SecretsManagementPage() {
  const styles = useStyles2(getStyles);

  const canList = contextSrv.hasPermission(AccessControlAction.SecretSecureValuesRead);
  const canCreate = contextSrv.hasPermission(AccessControlAction.SecretSecureValuesCreate);

  const pageNav: NavModelItem = useMemo(
    () => ({
      text: t('secrets.page-title', 'Secrets'),
      children: [
        {
          text: t('secrets.tabs.values', 'Values'),
          url: '/admin/secrets/secure-values',
          active: true,
        },
        // Only show Keepers tab if feature flag is enabled
        ...(config.featureToggles.secretsKeeperUI
          ? [
              {
                text: t('secrets.tabs.keepers', 'Keepers'),
                url: '/admin/secrets/keepers',
                active: false,
              },
            ]
          : []),
      ],
    }),
    []
  );

  const {
    data: secureValueList,
    isLoading,
    isError,
    error,
    refetch,
  } = secretAPIv1beta1.useListSecureValueQuery({}, { skip: !canList });

  const [deleteSecureValue] = secretAPIv1beta1.useDeleteSecureValueMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<undefined | string>();
  const [filter, setFilter] = useState('');

  const isEditModalOpen = !!editTarget || isCreateModalOpen;
  const hasSecureValues = secureValueList && secureValueList.items?.length > 0;

  const handleShowCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleDismissModal = () => {
    setIsCreateModalOpen(false);
    setEditTarget(undefined);
  };

  const handleEditSecureValue = useCallback((name: string) => {
    setEditTarget(name);
  }, []);

  // Applies the same transformation as the name field in the secure value form.
  const handleFilterChange = (value: string) => {
    setFilter(value);
  };

  return (
    <Page
      navId="secrets-management"
      pageNav={pageNav}
      subTitle={
        <Trans i18nKey="secrets.sub-title">
          Manage secrets for use in Grafana. Find out more in our{' '}
          <TextLink
            href="https://grafana.com/docs/grafana-cloud/security-and-account-management/manage-secrets/"
            external
          >
            documentation
          </TextLink>
        </Trans>
      }
      actions={
        hasSecureValues &&
        canCreate && (
          <Button disabled={isLoading} icon="plus" onClick={handleShowCreateModal}>
            <Trans i18nKey="secrets.actions.create-secret">Create secure value</Trans>
          </Button>
        )
      }
    >
      <PageContents isLoading={isLoading}>
        <div className="page-action-bar">
          <InlineField grow disabled={!hasSecureValues}>
            <FilterInput
              className={styles.filterInput}
              placeholder={t('secrets.search-placeholder', 'Search secure value by name')}
              value={filter}
              onChange={handleFilterChange}
              escapeRegex={false}
            />
          </InlineField>
        </div>

        {isError ? (
          <EmptyState
            variant="not-found"
            message={t('secrets.error-state.message', 'Something went wrong')}
            button={
              <Trans i18nKey="secrets.error-state.retry">
                <Button onClick={() => refetch()}>Retry</Button>
              </Trans>
            }
          >
            <Trans i18nKey="secrets.error-state.body" values={{ details: getErrorMessage(error) }}>
              <p>
                This may be due to poor network conditions or a potential plugin blocking requests. Retry, and if the
                problem persists, contact support.
              </p>
              <Box marginTop={1}>
                <Text color="error" italic>
                  Details: {'{{details}}'}
                </Text>
              </Box>
            </Trans>
          </EmptyState>
        ) : (
          <SecretsList
            onEditSecureValue={handleEditSecureValue}
            onDeleteSecureValue={deleteSecureValue}
            onCreateSecureValue={handleShowCreateModal}
            secureValueList={secureValueList?.items}
            filter={filter}
          />
        )}

        {isEditModalOpen && <EditSecretModal isOpen onDismiss={handleDismissModal} name={editTarget} />}
      </PageContents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  filterInput: css({
    minWidth: '200px',
  }),
});
