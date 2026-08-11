import { css } from '@emotion/css';
import { type ComponentType, useState, useCallback, useMemo, useEffect } from 'react';

import type { GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { Stack, Button, Field, FilterInput, Divider, useStyles2 } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';
import { logError } from 'app/features/alerting/unified/Analytics';
import { EnrichmentAction, useEnrichmentAbility } from 'app/features/alerting/unified/hooks/useAbilities';
import { useSyncedUrlDrawerParam } from 'app/features/alerting/unified/hooks/useSyncedUrlDrawerParam';

import { useDeleteAlertEnrichmentMutation } from '../../../api/clients/alertenrichment/v1beta1';
import { DeleteEnrichmentModal } from '../components/DeleteEnrichmentModal';
import { EnrichmentCreateDrawer } from '../components/EnrichmentCreateDrawer';
import { EnrichmentEditDrawer } from '../components/EnrichmentEditDrawer';
import { EnrichmentFilter } from '../components/EnrichmentFilter';
import { EnrichmentReadOnlyDrawer } from '../components/EnrichmentReadOnlyDrawer';
import { ENRICHMENT_EDIT_NAME_PARAM, ENRICHMENT_VIEW_NAME_PARAM } from '../constants';
import { useEnrichmentFilter } from '../helpers/useEnrichmentFilter';
import { filterEnrichmentsBySearch, filterEnrichmentsByType } from '../helpers/useEnrichments';

import { EnrichmentSection } from './EnrichmentSection';

/** Props for the shared Rule + Global enrichments block (used in compact and default no-filter layouts). */
interface RuleAndGlobalSectionsProps {
  showRuleEnrichments: boolean;
  showGlobalEnrichments: boolean;
  showSectionHeader: boolean;
  filteredRuleEnrichments: AlertEnrichment[];
  filteredGlobalEnrichments: AlertEnrichment[];
  hasActiveFilters: boolean;
  isCreateDrawerOpen: boolean;
  enrichmentSelected: AlertEnrichment | null;
  canWrite: boolean;
  onEdit: (enrichment: AlertEnrichment) => void;
  onDelete: (enrichment: AlertEnrichment) => void;
  onRowClick: (enrichment: AlertEnrichment) => void;
  onOpenCreate: () => void;
}

function RuleAndGlobalSections({
  showRuleEnrichments,
  showGlobalEnrichments,
  showSectionHeader,
  filteredRuleEnrichments,
  filteredGlobalEnrichments,
  hasActiveFilters,
  isCreateDrawerOpen,
  enrichmentSelected,
  canWrite,
  onEdit,
  onDelete,
  onRowClick,
  onOpenCreate,
}: RuleAndGlobalSectionsProps) {
  const showAddButton = !isCreateDrawerOpen && !enrichmentSelected && canWrite;
  const ruleEmptyMessage = hasActiveFilters
    ? t('alerting.enrichment.filter.no-matching-enrichments', 'No matching enrichments found.')
    : t(
        'alerting.enrichment.drawer.rule-empty-state',
        'No enrichments configured yet.\nUse the button above to add your first enrichment.'
      );
  const globalEmptyMessage = hasActiveFilters
    ? t('alerting.enrichment.filter.no-matching-enrichments', 'No matching enrichments found.')
    : t(
        'alerting.enrichment.drawer.global-empty-state',
        'No global enrichments available.\nGlobal enrichments are managed separately and applied to all alert rules.'
      );

  return (
    <>
      {showRuleEnrichments && (
        <EnrichmentSection
          title={t('alerting.enrichment.drawer.rule-enrichments-title', 'Rule Enrichments')}
          subtitle={t(
            'alerting.enrichment.rule-enrichment-subtitle',
            'Add additional enrichments specific for this alert rule.'
          )}
          headerAction={
            showAddButton ? (
              <Stack direction="row" alignItems="flex-start">
                <Button variant="primary" size="md" icon="plus" onClick={onOpenCreate}>
                  <Trans i18nKey="alerting.enrichment.new-alert">New alert enrichment</Trans>
                </Button>
              </Stack>
            ) : undefined
          }
          enrichments={filteredRuleEnrichments}
          showActions={true}
          canWrite={canWrite}
          emptyStateMessage={ruleEmptyMessage}
          showSectionHeader={showSectionHeader}
          onEdit={onEdit}
          onDelete={onDelete}
          onRowClick={onRowClick}
        />
      )}
      {showRuleEnrichments && showGlobalEnrichments && <Divider />}
      {showGlobalEnrichments && (
        <EnrichmentSection
          title={t('alerting.enrichment.drawer.global-enrichments-title', 'Global Enrichments')}
          subtitle={t(
            'alerting.enrichment.global-enrichment-subtitle',
            'Global enrichments apply to all alert rules. Other enrichments scoped by labels or annotations may also apply, view the full list in Alerting > Settings.'
          )}
          enrichments={filteredGlobalEnrichments}
          showActions={false}
          emptyStateMessage={globalEmptyMessage}
          showSectionHeader={showSectionHeader}
          onRowClick={onRowClick}
        />
      )}
    </>
  );
}

export interface EnrichmentContentProps {
  ruleLevelEnrichments: AlertEnrichment[];
  globalEnrichments: AlertEnrichment[];
  ruleUid: string;
  onDeleteEnrichment?: (enrichmentId: string) => void;
  showRuleEnrichments?: boolean;
  showGlobalEnrichments?: boolean;
  showSectionHeader?: boolean;
  onEnrichmentCreated?: () => void;
  onEnrichmentUpdated?: () => void;
  filterLayout?: 'compact' | 'default';
}

export const EnrichmentContent: ComponentType<EnrichmentContentProps> = ({
  ruleLevelEnrichments,
  globalEnrichments,
  onDeleteEnrichment,
  ruleUid,
  showRuleEnrichments = true,
  showGlobalEnrichments = true,
  showSectionHeader = true,
  onEnrichmentCreated,
  onEnrichmentUpdated,
  filterLayout = 'default',
}) => {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [enrichmentSelected, setEnrichmentSelected] = useState<AlertEnrichment | null>(null);
  const [enrichmentToDelete, setEnrichmentToDelete] = useState<AlertEnrichment | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const readOnlyDrawerUrlParam = useSyncedUrlDrawerParam(ENRICHMENT_VIEW_NAME_PARAM);
  const editDrawerUrlParam = useSyncedUrlDrawerParam(ENRICHMENT_EDIT_NAME_PARAM);
  const readOnlyNameFromUrl = readOnlyDrawerUrlParam.value;
  const setReadOnlyNameInUrl = readOnlyDrawerUrlParam.setValue;
  const editNameFromUrl = editDrawerUrlParam.value;
  const setEditNameInUrl = editDrawerUrlParam.setValue;
  const [readOnlyDrawerEnrichment, setReadOnlyDrawerEnrichment] = useState<AlertEnrichment | null>(null);
  const { scope, type, setScope, setType, clearFilters, hasActiveFilters: urlHasActiveFilters } = useEnrichmentFilter();

  const styles = useStyles2(getStyles);
  const compact = filterLayout === 'compact';
  const hasActiveFilters = compact ? searchInput.trim() !== '' || type !== '' : urlHasActiveFilters;
  const handleClearFilters = useCallback(() => {
    clearFilters();
    if (compact) {
      setSearchInput('');
    }
  }, [clearFilters, compact]);

  const filteredRuleEnrichments = useMemo(() => {
    const byType = filterEnrichmentsByType(ruleLevelEnrichments, type);
    return filterEnrichmentsBySearch(byType, searchInput.trim());
  }, [ruleLevelEnrichments, type, searchInput]);

  const filteredGlobalEnrichments = useMemo(() => {
    const byType = filterEnrichmentsByType(globalEnrichments, type);
    return filterEnrichmentsBySearch(byType, searchInput.trim());
  }, [globalEnrichments, type, searchInput]);

  const flatFilteredEnrichments = useMemo(
    () => [...filteredRuleEnrichments, ...filteredGlobalEnrichments],
    [filteredRuleEnrichments, filteredGlobalEnrichments]
  );

  const allEnrichments = useMemo(
    () => [...ruleLevelEnrichments, ...globalEnrichments],
    [ruleLevelEnrichments, globalEnrichments]
  );

  useEffect(() => {
    if (isCreateDrawerOpen) {
      return;
    }
    if (editNameFromUrl) {
      if (readOnlyNameFromUrl) {
        setReadOnlyNameInUrl(null, true);
      }
      if (readOnlyDrawerEnrichment) {
        setReadOnlyDrawerEnrichment(null);
      }
    }
  }, [editNameFromUrl, isCreateDrawerOpen, readOnlyNameFromUrl, readOnlyDrawerEnrichment, setReadOnlyNameInUrl]);

  // Deep link / invalid name: resolve `?enrichment=<metadata.name>` once data is available.
  useEffect(() => {
    if (isCreateDrawerOpen) {
      return;
    }
    if (!readOnlyNameFromUrl) {
      return;
    }
    if (enrichmentSelected) {
      return;
    }
    const found = allEnrichments.find((e) => e.metadata?.name === readOnlyNameFromUrl);
    if (found) {
      setReadOnlyDrawerEnrichment((current) => (current?.metadata?.name === found.metadata?.name ? current : found));
    } else if (allEnrichments.length > 0) {
      setReadOnlyNameInUrl(null, true);
    }
  }, [allEnrichments, enrichmentSelected, isCreateDrawerOpen, readOnlyNameFromUrl, setReadOnlyNameInUrl]);

  // Deep link / invalid name: resolve `?enrichment_edit=<metadata.name>` once data is available.
  useEffect(() => {
    if (isCreateDrawerOpen) {
      return;
    }
    if (!editNameFromUrl) {
      return;
    }
    if (enrichmentSelected?.metadata?.name === editNameFromUrl) {
      return;
    }
    const found = allEnrichments.find((e) => e.metadata?.name === editNameFromUrl);
    if (found) {
      setEnrichmentSelected(found);
    } else if (allEnrichments.length > 0) {
      setEditNameInUrl(null, true);
    }
  }, [allEnrichments, editNameFromUrl, enrichmentSelected, isCreateDrawerOpen, setEditNameInUrl]);

  const handleReadOnlyRowClick = useCallback(
    (enrichment: AlertEnrichment) => {
      const name = enrichment.metadata?.name;
      if (!name) {
        return;
      }
      setEnrichmentSelected(null);
      setEditNameInUrl(null, true);
      setReadOnlyNameInUrl(name, false);
      setReadOnlyDrawerEnrichment(enrichment);
    },
    [setEditNameInUrl, setReadOnlyNameInUrl]
  );

  const handleCloseReadOnlyDrawer = useCallback(() => {
    setReadOnlyDrawerEnrichment(null);
    setReadOnlyNameInUrl(null, false);
  }, [setReadOnlyNameInUrl]);

  const openCreateEnrichment = useCallback(() => {
    setEnrichmentSelected(null);
    setReadOnlyDrawerEnrichment(null);
    setIsCreateDrawerOpen(true);
  }, []);

  const handleCloseCreateDrawer = useCallback(() => {
    setIsCreateDrawerOpen(false);
    setReadOnlyNameInUrl(null, true);
    setEditNameInUrl(null, true);
  }, [setEditNameInUrl, setReadOnlyNameInUrl]);

  const handleCreateSuccess = useCallback(() => {
    onEnrichmentCreated?.();
    setIsCreateDrawerOpen(false);
    setReadOnlyNameInUrl(null, true);
    setEditNameInUrl(null, true);
  }, [onEnrichmentCreated, setEditNameInUrl, setReadOnlyNameInUrl]);

  const handleEditSuccess = useCallback(() => {
    onEnrichmentUpdated?.();
    setEnrichmentSelected(null);
    setEditNameInUrl(null, true);
  }, [onEnrichmentUpdated, setEditNameInUrl]);

  const [deleteEnrichmentMutation] = useDeleteAlertEnrichmentMutation();

  const [, canWrite] = useEnrichmentAbility(EnrichmentAction.Write);

  const handleEdit = useCallback(
    (enrichment: AlertEnrichment) => {
      const name = enrichment.metadata?.name;
      if (!name) {
        return;
      }
      setReadOnlyDrawerEnrichment(null);
      setReadOnlyNameInUrl(null, true);
      setEditNameInUrl(name, false);
      setEnrichmentSelected(enrichment);
    },
    [setEditNameInUrl, setReadOnlyNameInUrl]
  );

  const handleCloseEditDrawer = useCallback(() => {
    setEnrichmentSelected(null);
    setEditNameInUrl(null, false);
  }, [setEditNameInUrl]);

  const handleDelete = useCallback((enrichment: AlertEnrichment) => {
    setEnrichmentToDelete(enrichment);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (enrichmentToDelete?.metadata?.name) {
      const deletedName = enrichmentToDelete.metadata.name;
      await deleteEnrichmentMutation({ name: deletedName });
      setEnrichmentToDelete(null);
      if (onDeleteEnrichment) {
        onDeleteEnrichment(deletedName);
      }
      if (deletedName === readOnlyNameFromUrl) {
        setReadOnlyNameInUrl(null, true);
      }
      if (deletedName === editNameFromUrl) {
        setEditNameInUrl(null, true);
      }
    } else {
      logError(new Error('No enrichment to delete', { cause: 'Enrichment has no metadata.name defined' }));
    }
  }, [
    deleteEnrichmentMutation,
    editNameFromUrl,
    enrichmentToDelete,
    onDeleteEnrichment,
    readOnlyNameFromUrl,
    setEditNameInUrl,
    setReadOnlyNameInUrl,
  ]);

  const handleCancelDelete = useCallback(() => {
    setEnrichmentToDelete(null);
  }, []);

  /** Match notification policies "Search by matchers" input width (width={46} in 8px units) */
  const ENRICHMENT_SEARCH_INPUT_WIDTH = 46;

  const searchInputEl = (
    <FilterInput
      id="enrichment-search"
      value={searchInput}
      onChange={(value) => setSearchInput(value)}
      placeholder={t('alerting.enrichment.search.placeholder', 'Search by enrichment name...')}
      escapeRegex={false}
      data-testid="enrichment-search-input"
      width={ENRICHMENT_SEARCH_INPUT_WIDTH}
    />
  );

  return (
    <Stack direction="column" gap={3}>
      {compact ? (
        <EnrichmentFilter
          scope={scope}
          type={type}
          onScopeChange={setScope}
          onTypeChange={setType}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          compact={true}
          showClearButton={false}
          searchSlot={
            <Field
              label={t('alerting.enrichment.search.label', 'Search')}
              htmlFor="enrichment-search"
              className={styles.fieldNoMarginBottom}
            >
              {searchInputEl}
            </Field>
          }
        />
      ) : (
        <>
          <Field
            label={t('alerting.enrichment.search.label', 'Search')}
            htmlFor="enrichment-search"
            className={styles.fieldNoMarginBottom}
          >
            {searchInputEl}
          </Field>
          <EnrichmentFilter
            scope={scope}
            type={type}
            onScopeChange={setScope}
            onTypeChange={setType}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            showClearButton={false}
          />
        </>
      )}

      {/* Compact: always two sections. Default: single flat list when filters active, else two sections. */}
      {compact ? (
        <RuleAndGlobalSections
          showRuleEnrichments={showRuleEnrichments}
          showGlobalEnrichments={showGlobalEnrichments}
          showSectionHeader={showSectionHeader}
          filteredRuleEnrichments={filteredRuleEnrichments}
          filteredGlobalEnrichments={filteredGlobalEnrichments}
          hasActiveFilters={hasActiveFilters}
          isCreateDrawerOpen={isCreateDrawerOpen}
          enrichmentSelected={enrichmentSelected}
          canWrite={canWrite}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={handleReadOnlyRowClick}
          onOpenCreate={openCreateEnrichment}
        />
      ) : hasActiveFilters ? (
        showRuleEnrichments && (
          <EnrichmentSection
            title={t('alerting.enrichment.drawer.enrichments-title', 'Enrichments')}
            subtitle={t(
              'alerting.enrichment.filter.filtered-subtitle',
              'Filtered enrichments. Clear filters to see rule and global sections separately.'
            )}
            headerAction={
              !isCreateDrawerOpen && !enrichmentSelected && canWrite && scope !== 'global' ? (
                <Stack direction="row" alignItems="flex-start">
                  <Button variant="primary" size="md" icon="plus" onClick={openCreateEnrichment}>
                    <Trans i18nKey="alerting.enrichment.new-alert">New alert enrichment</Trans>
                  </Button>
                </Stack>
              ) : undefined
            }
            enrichments={
              scope === 'rule'
                ? filteredRuleEnrichments
                : scope === 'global'
                  ? filteredGlobalEnrichments
                  : flatFilteredEnrichments
            }
            showActions={scope !== 'global'}
            canWrite={canWrite}
            emptyStateMessage={t('alerting.enrichment.filter.no-matches', 'No enrichments match the current filters.')}
            showSectionHeader={showSectionHeader}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRowClick={handleReadOnlyRowClick}
          />
        )
      ) : (
        <RuleAndGlobalSections
          showRuleEnrichments={showRuleEnrichments}
          showGlobalEnrichments={showGlobalEnrichments}
          showSectionHeader={showSectionHeader}
          filteredRuleEnrichments={filteredRuleEnrichments}
          filteredGlobalEnrichments={filteredGlobalEnrichments}
          hasActiveFilters={false}
          isCreateDrawerOpen={isCreateDrawerOpen}
          enrichmentSelected={enrichmentSelected}
          canWrite={canWrite}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={handleReadOnlyRowClick}
          onOpenCreate={openCreateEnrichment}
        />
      )}

      {/* Delete Confirmation Modal */}
      {enrichmentToDelete && (
        <DeleteEnrichmentModal
          enrichment={enrichmentToDelete}
          onConfirm={handleConfirmDelete}
          onDismiss={handleCancelDelete}
        />
      )}

      <EnrichmentCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        ruleUid={ruleUid}
        onSuccess={handleCreateSuccess}
      />

      <EnrichmentEditDrawer
        isOpen={!!enrichmentSelected}
        onClose={handleCloseEditDrawer}
        enrichment={enrichmentSelected}
        onSuccess={handleEditSuccess}
      />

      <EnrichmentReadOnlyDrawer
        isOpen={!enrichmentSelected && !!readOnlyDrawerEnrichment}
        onClose={handleCloseReadOnlyDrawer}
        enrichment={readOnlyDrawerEnrichment}
      />
    </Stack>
  );
};

function getStyles(_theme: GrafanaTheme2) {
  return {
    fieldNoMarginBottom: css({
      marginBottom: 0,
    }),
  };
}
