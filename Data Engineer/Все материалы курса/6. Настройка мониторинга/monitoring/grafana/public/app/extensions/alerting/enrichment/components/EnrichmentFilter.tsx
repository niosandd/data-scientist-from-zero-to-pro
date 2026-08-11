import { css } from '@emotion/css';
import { useMemo } from 'react';

import type { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { Button, Label, RadioButtonGroup, Select, Stack, useStyles2 } from '@grafana/ui';

import { getEnricherTypeOptions, type EnrichmentType } from '../form/form';
import type { EnrichmentScopeFilter } from '../helpers/useEnrichmentFilter';

type EnrichmentFilterVariant = 'rulePage' | 'settingsPage';

export interface EnrichmentFilterProps {
  scope: EnrichmentScopeFilter;
  type: EnrichmentType | '';
  onScopeChange: (scope: EnrichmentScopeFilter) => void;
  onTypeChange: (type: EnrichmentType | '') => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  scopeFilterVariant?: EnrichmentFilterVariant;
  compact?: boolean;
  inlineLayout?: boolean;
  /** When compact or inlineLayout, render this first in the row (e.g. FilterInput for search) */
  searchSlot?: React.ReactNode;
  /** When false, the Clear filters button is hidden (e.g. on rule page where only search and type filter exist) */
  showClearButton?: boolean;
}

interface EnrichmentFilterLayoutProps extends EnrichmentFilterProps {
  scopeOptions: Array<{ label: string; value: EnrichmentScopeFilter }>;
  typeOptions: Array<SelectableValue<EnrichmentType | ''>>;
  typeSelectValue: SelectableValue<EnrichmentType | ''>;
  scopeSelectValue: SelectableValue<EnrichmentScopeFilter>;
}

function EnrichmentFilterCompact({
  onTypeChange,
  onClear,
  hasActiveFilters,
  searchSlot,
  showClearButton = true,
  typeOptions,
  typeSelectValue,
}: EnrichmentFilterLayoutProps) {
  const styles = useStyles2(getFilterStyles);
  return (
    <Stack direction="row" gap={3} alignItems="flex-end" wrap="nowrap" justifyContent="flex-start">
      {searchSlot}
      <div>
        <Label>
          <Trans i18nKey="alerting.enrichment.filter.type-label">Filter by type</Trans>
        </Label>
        <div className={styles.selectWrapper}>
          <Select<EnrichmentType | ''>
            aria-label={t('alerting.enrichment.filter.type-label', 'Filter by type')}
            options={typeOptions}
            value={typeSelectValue}
            onChange={(v) => onTypeChange((v?.value ?? '') as EnrichmentType | '')}
            width={24}
          />
        </div>
      </div>
      {showClearButton && hasActiveFilters && (
        <Button type="button" variant="secondary" onClick={onClear} icon="times" size="sm">
          <Trans i18nKey="alerting.enrichment.filter.clear">Clear filters</Trans>
        </Button>
      )}
    </Stack>
  );
}

function EnrichmentFilterInline({
  onScopeChange,
  onTypeChange,
  onClear,
  hasActiveFilters,
  scopeFilterVariant = 'rulePage',
  searchSlot,
  showClearButton = true,
  scopeOptions,
  typeOptions,
  typeSelectValue,
  scopeSelectValue,
}: EnrichmentFilterLayoutProps) {
  const styles = useStyles2(getFilterStyles);
  return (
    <Stack direction="row" gap={3} alignItems="flex-end" wrap="wrap" justifyContent="flex-start">
      {searchSlot}
      {scopeFilterVariant === 'settingsPage' && (
        <div>
          <Label>
            <Trans i18nKey="alerting.enrichment.filter.scope-dropdown-label">Filter by scope</Trans>
          </Label>
          <div className={styles.selectWrapper}>
            <Select<EnrichmentScopeFilter>
              aria-label={t('alerting.enrichment.filter.scope-dropdown-label', 'Filter by scope')}
              options={scopeOptions}
              value={scopeSelectValue}
              onChange={(v) => onScopeChange((v?.value ?? '') as EnrichmentScopeFilter)}
              width={24}
            />
          </div>
        </div>
      )}
      <div>
        <Label>
          <Trans i18nKey="alerting.enrichment.filter.type-label">Filter by type</Trans>
        </Label>
        <div className={styles.selectWrapper}>
          <Select<EnrichmentType | ''>
            aria-label={t('alerting.enrichment.filter.type-label', 'Filter by type')}
            options={typeOptions}
            value={typeSelectValue}
            onChange={(v) => onTypeChange((v?.value ?? '') as EnrichmentType | '')}
            width={24}
          />
        </div>
      </div>
      {showClearButton && hasActiveFilters && (
        <div className={styles.clearButtonWrapper}>
          <Button type="button" variant="secondary" onClick={onClear} icon="times" size="sm">
            <Trans i18nKey="alerting.enrichment.filter.clear">Clear filters</Trans>
          </Button>
        </div>
      )}
    </Stack>
  );
}

function EnrichmentFilterDefault({
  scope,
  type,
  onScopeChange,
  onTypeChange,
  onClear,
  hasActiveFilters,
  showClearButton = true,
  scopeOptions,
  typeOptions,
}: EnrichmentFilterLayoutProps) {
  return (
    <Stack direction="column" gap={2} alignItems="flex-start">
      <Stack direction="row" gap={3} alignItems="flex-start" wrap="wrap">
        <div>
          <Label>
            <Trans i18nKey="alerting.enrichment.filter.scope-label">Scope</Trans>
          </Label>
          <RadioButtonGroup
            options={scopeOptions}
            value={scope}
            onChange={(v) => onScopeChange((v as EnrichmentScopeFilter) ?? '')}
          />
        </div>
        <div>
          <Label>
            <Trans i18nKey="alerting.enrichment.filter.type-label">Filter by type</Trans>
          </Label>
          <RadioButtonGroup
            options={typeOptions}
            value={type}
            onChange={(v) => onTypeChange((v as EnrichmentType) ?? '')}
          />
        </div>
      </Stack>
      {showClearButton && hasActiveFilters && (
        <Button type="button" variant="secondary" onClick={onClear} icon="times" size="sm">
          <Trans i18nKey="alerting.enrichment.filter.clear">Clear filters</Trans>
        </Button>
      )}
    </Stack>
  );
}

export function EnrichmentFilter({
  scope,
  type,
  onScopeChange,
  onTypeChange,
  onClear,
  hasActiveFilters,
  scopeFilterVariant = 'rulePage',
  compact = false,
  inlineLayout = false,
  searchSlot,
  showClearButton = true,
}: EnrichmentFilterProps) {
  const scopeOptionsRulePage = useMemo<Array<{ label: string; value: EnrichmentScopeFilter }>>(
    () => [
      { label: t('alerting.enrichment.filter.scope.all', 'All'), value: '' },
      { label: t('alerting.enrichment.filter.scope.rule', 'Rule'), value: 'rule' },
      { label: t('alerting.enrichment.filter.scope.global', 'Global'), value: 'global' },
    ],
    []
  );

  const scopeOptionsSettingsPage = useMemo<Array<{ label: string; value: EnrichmentScopeFilter }>>(
    () => [
      { label: t('alerting.enrichment.filter.scope.all', 'All'), value: '' },
      { label: t('alerting.enrichment.filter.scope.rule', 'Rule'), value: 'rule' },
      { label: t('alerting.enrichment.filter.scope.global', 'Global'), value: 'global' },
      { label: t('alerting.enrichment.filter.scope.label', 'Label'), value: 'label' },
      { label: t('alerting.enrichment.filter.scope.annotation', 'Annotation'), value: 'annotation' },
    ],
    []
  );

  const typeOptions = useMemo<Array<SelectableValue<EnrichmentType | ''>>>(() => {
    const options: Array<SelectableValue<EnrichmentType | ''>> = [
      { label: t('alerting.enrichment.filter.type.all', 'All'), value: '' },
    ];
    getEnricherTypeOptions().forEach((opt) => {
      options.push({ label: opt.label, value: opt.value });
    });
    return options;
  }, []);

  const scopeOptions = scopeFilterVariant === 'settingsPage' ? scopeOptionsSettingsPage : scopeOptionsRulePage;
  const typeSelectValue = typeOptions.find((o) => o.value === type) ?? typeOptions[0];
  const scopeSelectValue = scopeOptions.find((o) => o.value === scope) ?? scopeOptions[0];

  const layoutProps: EnrichmentFilterLayoutProps = {
    scope,
    type,
    onScopeChange,
    onTypeChange,
    onClear,
    hasActiveFilters,
    scopeFilterVariant,
    compact,
    inlineLayout,
    searchSlot,
    showClearButton,
    scopeOptions,
    typeOptions,
    typeSelectValue,
    scopeSelectValue,
  };

  if (compact) {
    return <EnrichmentFilterCompact {...layoutProps} />;
  }
  if (inlineLayout) {
    return <EnrichmentFilterInline {...layoutProps} />;
  }
  return <EnrichmentFilterDefault {...layoutProps} />;
}

function getFilterStyles(theme: GrafanaTheme2) {
  return {
    clearButtonWrapper: css({
      paddingBottom: theme.spacing(0.5),
    }),
    selectWrapper: css({
      minWidth: theme.spacing(20),
    }),
  };
}
