import { useListAlertEnrichmentQuery } from '../../../api/clients/alertenrichment/v1beta1';
import type { AlertEnrichment, EnricherConfig } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import {
  DEFAULT_ENRICHMENTS_LIMIT,
  ENRICHMENT_RULE_UID_LABEL_PREFIX,
  GLOBAL_ENRICHMENT_SCOPE_LABEL_SELECTOR,
} from '../constants';
import type { EnrichmentType } from '../form/form';

/**
 * Case-insensitive substring match on enrichment title (name). Used for search on rule page and settings page.
 */
export function filterEnrichmentsBySearch(enrichments: AlertEnrichment[], query: string): AlertEnrichment[] {
  if (!query.trim()) {
    return enrichments;
  }
  const normalized = query.trim().toLowerCase();
  return enrichments.filter((e) => (e.spec?.title ?? '').toLowerCase().includes(normalized));
}

/**
 * Returns the enricher type of the first step, or undefined.
 */
function getEnricherTypeFromEnrichment(enrichment: AlertEnrichment): EnricherConfig['type'] | undefined {
  return enrichment.spec?.steps?.[0]?.enricher?.type;
}

/**
 * Filters enrichments by enricher type (first step). Empty type = no filter.
 */
export function filterEnrichmentsByType(enrichments: AlertEnrichment[], type: EnrichmentType | ''): AlertEnrichment[] {
  if (!type) {
    return enrichments;
  }
  return enrichments.filter((e) => getEnricherTypeFromEnrichment(e) === type);
}

/**
 * True when the enrichment is rule-scoped (attached to specific rule(s) via alertRuleUids).
 * Used on the settings page where we have a single list of all enrichments.
 */
function isRuleScopedEnrichment(enrichment: AlertEnrichment): boolean {
  const uids = enrichment.spec?.alertRuleUids;
  return Array.isArray(uids) && uids.length > 0;
}

/**
 * Filters enrichments by scope for settings page (single list).
 * Rule = has alertRuleUids; Global = globally scoped (no matchers); Label = has labelMatchers; Annotation = has annotationMatchers.
 */
export function filterEnrichmentsByScope(
  enrichments: AlertEnrichment[],
  scope: 'rule' | 'global' | 'label' | 'annotation' | ''
): AlertEnrichment[] {
  if (!scope) {
    return enrichments;
  }
  if (scope === 'rule') {
    return enrichments.filter(isRuleScopedEnrichment);
  }
  if (scope === 'global') {
    return enrichments.filter((e) => !isRuleScopedEnrichment(e) && isGloballyScopedEnrichment(e));
  }
  if (scope === 'label') {
    const hasLabelMatchers = (e: AlertEnrichment) =>
      Array.isArray(e.spec?.labelMatchers) && e.spec.labelMatchers.length > 0;
    return enrichments.filter(hasLabelMatchers);
  }
  if (scope === 'annotation') {
    const hasAnnotationMatchers = (e: AlertEnrichment) =>
      Array.isArray(e.spec?.annotationMatchers) && e.spec.annotationMatchers.length > 0;
    return enrichments.filter(hasAnnotationMatchers);
  }
  return enrichments;
}

/**
 * Returns true when the enrichment is globally scoped ("All alerts" / "Global scoped" in the UI).
 * Globally scoped = no label matchers and no annotation matchers, so it applies to all rules.
 * Only these should appear in the "global enrichments" section on the rule page.
 */
export function isGloballyScopedEnrichment(enrichment: AlertEnrichment): boolean {
  const labelMatchers = enrichment.spec?.labelMatchers;
  const annotationMatchers = enrichment.spec?.annotationMatchers;
  const hasLabelMatchers = Array.isArray(labelMatchers) && labelMatchers.length > 0;
  const hasAnnotationMatchers = Array.isArray(annotationMatchers) && annotationMatchers.length > 0;
  return !hasLabelMatchers && !hasAnnotationMatchers;
}

/**
 * Filters to only globally scoped enrichments (scope = "All alerts" / "Global scoped").
 * Excludes label-scoped and annotation-scoped enrichments from the global section on the rule page.
 */
export function filterToGloballyScopedEnrichments(enrichments: AlertEnrichment[]): AlertEnrichment[] {
  return enrichments.filter(isGloballyScopedEnrichment);
}

export function useFilteredEnrichments(limit = DEFAULT_ENRICHMENTS_LIMIT, ruleUid?: string) {
  const {
    data: globalData,
    refetch: refetchGlobal,
    isLoading: isLoadingGlobal,
    isFetching: isFetchingGlobal,
    error: globalError,
  } = useListAlertEnrichmentQuery({ limit, labelSelector: GLOBAL_ENRICHMENT_SCOPE_LABEL_SELECTOR });

  const labelSelectorForRule = ruleUid ? `${ENRICHMENT_RULE_UID_LABEL_PREFIX}.${ruleUid}` : undefined;
  const {
    data: ruleData,
    refetch: refetchRule,
    isLoading: isLoadingRule,
    isFetching: isFetchingRule,
    error: ruleError,
  } = useListAlertEnrichmentQuery({ limit, labelSelector: labelSelectorForRule }, { skip: !labelSelectorForRule });

  const ruleItems = ruleData?.items ?? [];
  const rawGlobalItems = globalData?.items ?? [];
  // Phase 2 Step 1: show only enrichments with scope "Global scoped" (all alerts) in the global section.
  // Exclude label-scoped and annotation-scoped so we only show enrichments that apply to all rules.
  const globalEnrichments = filterToGloballyScopedEnrichments(rawGlobalItems);

  const refetch = async (): Promise<void> => {
    await refetchGlobal();
    if (labelSelectorForRule) {
      await refetchRule();
    }
  };

  return {
    ruleLevelEnrichments: ruleItems,
    globalEnrichments,
    refetch,
    isLoading: isLoadingGlobal || isLoadingRule,
    isFetching: isFetchingGlobal || isFetchingRule,
    error: globalError ?? ruleError,
  };
}
