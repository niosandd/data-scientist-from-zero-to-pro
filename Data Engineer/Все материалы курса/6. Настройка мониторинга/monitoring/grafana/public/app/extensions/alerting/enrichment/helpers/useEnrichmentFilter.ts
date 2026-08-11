import { useCallback, useMemo } from 'react';

import { useURLSearchParams } from 'app/features/alerting/unified/hooks/useURLSearchParams';

import { ENRICHMENT_FILTER_SCOPE_PARAM, ENRICHMENT_FILTER_TYPE_PARAM } from '../constants';
import type { EnrichmentType } from '../form/form';

export type EnrichmentScopeFilter = '' | 'rule' | 'global' | 'label' | 'annotation';

export interface EnrichmentFilterState {
  scope: EnrichmentScopeFilter;
  type: EnrichmentType | '';
}

export function useEnrichmentFilter(): EnrichmentFilterState & {
  setScope: (scope: EnrichmentScopeFilter) => void;
  setType: (type: EnrichmentType | '') => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
} {
  const [queryParams, updateQueryParams] = useURLSearchParams();

  const scope = (queryParams.get(ENRICHMENT_FILTER_SCOPE_PARAM) ?? '') as EnrichmentScopeFilter;
  const type = (queryParams.get(ENRICHMENT_FILTER_TYPE_PARAM) ?? '') as EnrichmentType | '';

  const setScope = useCallback(
    (newScope: EnrichmentScopeFilter) => {
      updateQueryParams({
        [ENRICHMENT_FILTER_SCOPE_PARAM]: newScope || undefined,
      });
    },
    [updateQueryParams]
  );

  const setType = useCallback(
    (newType: EnrichmentType | '') => {
      updateQueryParams({
        [ENRICHMENT_FILTER_TYPE_PARAM]: newType || undefined,
      });
    },
    [updateQueryParams]
  );

  const clearFilters = useCallback(() => {
    updateQueryParams({
      [ENRICHMENT_FILTER_SCOPE_PARAM]: undefined,
      [ENRICHMENT_FILTER_TYPE_PARAM]: undefined,
    });
  }, [updateQueryParams]);

  const hasActiveFilters = useMemo(() => scope !== '' || type !== '', [scope, type]);

  return {
    scope,
    type,
    setScope,
    setType,
    clearFilters,
    hasActiveFilters,
  };
}
