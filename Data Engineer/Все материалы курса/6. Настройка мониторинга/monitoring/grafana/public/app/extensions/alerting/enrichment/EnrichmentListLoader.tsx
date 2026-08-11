import { css } from '@emotion/css';
import { useState, useCallback, useMemo } from 'react';
import { useEffectOnce } from 'react-use';

import type { GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { Button, Field, FilterInput, Stack, Text, useStyles2 } from '@grafana/ui';
import { logError } from 'app/features/alerting/unified/Analytics';
import { AlertingPageWrapper } from 'app/features/alerting/unified/components/AlertingPageWrapper';
import { useAsync } from 'app/features/alerting/unified/hooks/useAsync';
import { useSettingsPageNav } from 'app/features/alerting/unified/settings/navigation';

import {
  useDeleteAlertEnrichmentMutation,
  useLazyListAlertEnrichmentQuery,
} from '../../api/clients/alertenrichment/v1beta1';
import { type AlertEnrichment } from '../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnrichmentList } from './EnrichmentsList';
import { DeleteEnrichmentModal } from './components/DeleteEnrichmentModal';
import { EnrichmentCreateDrawer } from './components/EnrichmentCreateDrawer';
import { EnrichmentEditDrawer } from './components/EnrichmentEditDrawer';
import { EnrichmentFilter } from './components/EnrichmentFilter';
import { EnrichmentReadOnlyDrawer } from './components/EnrichmentReadOnlyDrawer';
import { DEFAULT_ENRICHMENTS_LIMIT } from './constants';
import { useEnrichmentFilter } from './helpers/useEnrichmentFilter';
import { filterEnrichmentsBySearch, filterEnrichmentsByScope, filterEnrichmentsByType } from './helpers/useEnrichments';

// The API pagination is currently broken so we try to fetch everything in one request
const API_PAGE_SIZE = DEFAULT_ENRICHMENTS_LIMIT;

function EnrichmentListLoader() {
  const { pageNav, navId } = useSettingsPageNav();

  const [enrichmentToDelete, setEnrichmentToDelete] = useState<AlertEnrichment | null>(null);
  const [readOnlyDrawerEnrichment, setReadOnlyDrawerEnrichment] = useState<AlertEnrichment | null>(null);
  const [editDrawerEnrichment, setEditDrawerEnrichment] = useState<AlertEnrichment | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { enrichments, isLoading, isFetching, hasNextPage, loadNextPage, deleteEnrichment, refetch } =
    useEnrichmentList();
  const { scope, type, setScope, setType, clearFilters, hasActiveFilters } = useEnrichmentFilter();

  const filteredEnrichments = useMemo(() => {
    const byScope = filterEnrichmentsByScope(enrichments, scope);
    const byType = filterEnrichmentsByType(byScope, type);
    return filterEnrichmentsBySearch(byType, searchInput.trim());
  }, [enrichments, scope, type, searchInput]);

  const hasActiveFiltersOrSearch = hasActiveFilters || searchInput.trim() !== '';

  const handleDelete = useCallback((enrichment: AlertEnrichment) => {
    setEnrichmentToDelete(enrichment);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (enrichmentToDelete?.metadata?.name) {
      await deleteEnrichment({ k8sName: enrichmentToDelete.metadata.name });
      setEnrichmentToDelete(null);
    } else {
      logError(new Error('No enrichment to delete', { cause: 'Enrichment has no metadata.name defined' }));
    }
  }, [deleteEnrichment, enrichmentToDelete]);

  const handleCancelDelete = useCallback(() => {
    setEnrichmentToDelete(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setSearchInput('');
  }, [clearFilters]);

  const styles = useStyles2(getStyles);
  const ENRICHMENT_SEARCH_INPUT_WIDTH = 46;

  return (
    <AlertingPageWrapper pageNav={pageNav} navId={navId} isLoading={isLoading}>
      <Stack direction="column" gap={2}>
        <Stack direction="row" gap={2} justifyContent="space-between">
          <Text color="secondary">
            <Trans i18nKey="alerting.enrichment.tab.description">
              Make your alert notifications more actionable by running preliminary analysis and adding more context.
            </Trans>
          </Text>
          <Button variant="primary" icon="plus" size="md" onClick={() => setCreateDrawerOpen(true)}>
            <Trans i18nKey="alerting.enrichment.new-alert">New alert enrichment</Trans>
          </Button>
        </Stack>
        <EnrichmentFilter
          scope={scope}
          type={type}
          onScopeChange={setScope}
          onTypeChange={setType}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFiltersOrSearch}
          scopeFilterVariant="settingsPage"
          inlineLayout={true}
          searchSlot={
            <Field
              label={t('alerting.enrichment.search.label', 'Search')}
              htmlFor="enrichment-search-settings"
              className={styles.fieldNoMarginBottom}
            >
              <FilterInput
                id="enrichment-search-settings"
                value={searchInput}
                onChange={(value) => setSearchInput(value)}
                placeholder={t('alerting.enrichment.search.placeholder', 'Search by enrichment name...')}
                escapeRegex={false}
                data-testid="enrichment-search-input"
                width={ENRICHMENT_SEARCH_INPUT_WIDTH}
              />
            </Field>
          }
        />
        <EnrichmentList
          enrichments={filteredEnrichments}
          onDelete={handleDelete}
          onView={setReadOnlyDrawerEnrichment}
          onEdit={setEditDrawerEnrichment}
          isLoading={isFetching}
          hasMore={hasNextPage}
          onLoadMore={loadNextPage}
          hasActiveFilters={hasActiveFiltersOrSearch}
        />
      </Stack>
      <EnrichmentReadOnlyDrawer
        isOpen={!!readOnlyDrawerEnrichment}
        onClose={() => setReadOnlyDrawerEnrichment(null)}
        enrichment={readOnlyDrawerEnrichment}
      />
      <EnrichmentCreateDrawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => {
          setCreateDrawerOpen(false);
          refetch();
        }}
      />
      <EnrichmentEditDrawer
        isOpen={!!editDrawerEnrichment}
        onClose={() => setEditDrawerEnrichment(null)}
        enrichment={editDrawerEnrichment}
        onSuccess={refetch}
      />
      {enrichmentToDelete && (
        <DeleteEnrichmentModal
          enrichment={enrichmentToDelete}
          onConfirm={handleConfirmDelete}
          onDismiss={handleCancelDelete}
        />
      )}
    </AlertingPageWrapper>
  );
}

function getStyles(_theme: GrafanaTheme2) {
  return {
    fieldNoMarginBottom: css({
      marginBottom: 0,
    }),
  };
}

function useEnrichmentList() {
  const [continueToken, setContinueToken] = useState<string | undefined>();
  const [enrichments, setEnrichments] = useState<AlertEnrichment[]>([]);

  const [triggerQuery, { isLoading, isFetching }] = useLazyListAlertEnrichmentQuery();
  const [deleteEnrichmentMutation] = useDeleteAlertEnrichmentMutation();

  const [loadNextPageActions] = useAsync(async (continueToken?: string) => {
    const response = await triggerQuery({
      limit: API_PAGE_SIZE,
      continue: continueToken,
    }).unwrap();

    if (response?.items) {
      setEnrichments((prev) => [...prev, ...(response.items || [])]);
      setContinueToken(response.metadata?.continue);
    }
  });

  useEffectOnce(() => {
    loadNextPageActions.execute();
  }); // Only run on mount

  const loadNextPage = useCallback(() => {
    loadNextPageActions.execute(continueToken);
  }, [loadNextPageActions, continueToken]);

  const deleteEnrichment = useCallback(
    async ({ k8sName }: { k8sName: string }) => {
      // When deleteing an enrichment we need to reset the list because continue tokens will change after deletion
      await deleteEnrichmentMutation({ name: k8sName });
      setEnrichments([]);
      setContinueToken(undefined);
      loadNextPageActions.execute();
    },
    [deleteEnrichmentMutation, loadNextPageActions]
  );

  const hasNextPage = Boolean(continueToken);

  const refetch = useCallback(() => {
    setEnrichments([]);
    setContinueToken(undefined);
    loadNextPageActions.execute();
  }, [loadNextPageActions]);

  return {
    enrichments,
    isLoading,
    isFetching,
    hasNextPage,
    loadNextPage,
    deleteEnrichment,
    refetch,
  };
}

export default EnrichmentListLoader;
