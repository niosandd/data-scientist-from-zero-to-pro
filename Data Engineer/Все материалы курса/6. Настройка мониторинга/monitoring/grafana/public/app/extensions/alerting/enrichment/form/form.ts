import type { FeatureToggles } from '@grafana/data';
import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { type ComboboxOption } from '@grafana/ui';
import { useAppNotification } from 'app/core/copy/appNotification';
import {
  type AlertEnrichment,
  type AlertEnrichmentSpec,
  type CreateAlertEnrichmentApiArg,
  type ReplaceAlertEnrichmentApiArg,
  type EnricherConfig,
  type Matcher,
  type Step,
  generatedAPI,
} from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';
import { logError } from 'app/features/alerting/unified/Analytics';
import { stringifyErrorLike } from 'app/features/alerting/unified/utils/misc';

import { trackEnrichmentFormError, trackEnrichmentSaved } from '../analytics/Analytics';
import { getEnrichmentTrackingPropsFromFormData } from '../analytics/utils';

export type EnrichmentScope = 'global' | 'label' | 'annotation';
export type EnrichmentCreationOrigin = 'ruleDrawer' | 'enrichmentForm' | 'enrichmentContent';

export interface AlertEnrichmentFormData {
  title: string;
  description?: string;
  steps: Step[];
  scope: EnrichmentScope;
  labelMatchers?: Matcher[];
  annotationMatchers?: Matcher[];
  alertRuleUids?: string[];
}

export type EnrichmentType = EnricherConfig['type'];

const DEFAULT_ENRICHMENT_TIMEOUT = '30s';
const ENRICHMENT_NAME_PREFIX = 'enrichment-';

/**
 * Creates an AlertEnrichment object from form data for creation
 * @param formData - The form data to convert
 * @returns AlertEnrichment object ready for API creation
 */
function createAlertEnrichmentFromFormData(formData: AlertEnrichmentFormData): AlertEnrichment {
  return {
    metadata: { generateName: ENRICHMENT_NAME_PREFIX },
    spec: formDataToEnrichmentSpec(formData),
  };
}

/**
 * Custom hook for handling enrichment creation with built-in tracking
 * @param origin - The origin of the creation ('ruleDrawer' | 'enrichmentForm')
 * @param onSuccess - Optional callback to execute on successful creation
 * @param onError - Optional callback to execute on error (if not provided, uses default error handling)
 * @returns Object with createEnrichment function and loading state
 */
export function useEnrichmentCreation(
  origin: EnrichmentCreationOrigin,
  onSuccess?: () => void,
  onError?: (err: any) => void
) {
  const [createAlertEnrichment, { isLoading }] = generatedAPI.useCreateAlertEnrichmentMutation();
  const notifyApp = useAppNotification();

  const createEnrichment = async (formData: AlertEnrichmentFormData): Promise<void> => {
    const alertEnrichment = createAlertEnrichmentFromFormData(formData);
    const apiArg: CreateAlertEnrichmentApiArg = { alertEnrichment };

    // Get tracking props for analytics
    const trackingProps = getEnrichmentTrackingPropsFromFormData(formData, 'create');

    try {
      await createAlertEnrichment(apiArg).unwrap();
      notifyApp.success(t('alert-enrichment.success', 'Alert enrichment created successfully!'));

      // Track successful creation with origin
      trackEnrichmentSaved({
        ...trackingProps,
        origin,
      });

      onSuccess?.();
    } catch (err) {
      // Track creation error with origin
      trackEnrichmentFormError({
        form_action: 'create',
        error_field: stringifyErrorLike(err),
        origin,
      });

      if (onError) {
        onError(err);
      } else {
        logError(new Error('Failed to create alert enrichment'));
        notifyApp.error(t('alert-enrichment.error', 'Failed to create alert enrichment'), stringifyErrorLike(err));
      }
    }
  };

  return {
    createEnrichment,
    isLoading,
  };
}

/**
 * Custom hook for handling enrichment updates with built-in tracking
 * @param origin - The origin of the update ('ruleDrawer' | 'enrichmentForm')
 * @param onSuccess - Optional callback to execute on successful update
 * @param onError - Optional callback to execute on error (if not provided, uses default error handling)
 * @returns Object with updateEnrichment function and loading state
 */
export function useEnrichmentUpdate(
  origin: EnrichmentCreationOrigin,
  onSuccess?: () => void,
  onError?: (err: any) => void
) {
  const [replaceAlertEnrichment, { isLoading }] = generatedAPI.useReplaceAlertEnrichmentMutation();
  const notifyApp = useAppNotification();

  const updateEnrichment = async (enrichment: AlertEnrichment, formData: AlertEnrichmentFormData): Promise<void> => {
    if (!enrichment.metadata) {
      notifyApp.error(t('alert-enrichment.metadata-error', 'Invalid enrichment metadata'));
      return;
    }

    const updatedEnrichment: AlertEnrichment = {
      metadata: { name: enrichment.metadata.name },
      spec: formDataToEnrichmentSpec(formData),
    };

    const apiArg: ReplaceAlertEnrichmentApiArg = {
      name: enrichment.metadata.name || '',
      alertEnrichment: updatedEnrichment,
    };

    // Get tracking props for analytics
    const trackingProps = getEnrichmentTrackingPropsFromFormData(formData, 'update');

    try {
      await replaceAlertEnrichment(apiArg).unwrap();
      notifyApp.success(t('alert-enrichment.update-success', 'Alert enrichment updated successfully!'));

      // Track successful update with origin
      trackEnrichmentSaved({
        ...trackingProps,
        origin,
      });

      onSuccess?.();
    } catch (err) {
      // Track update error with origin
      trackEnrichmentFormError({
        form_action: 'update',
        error_field: stringifyErrorLike(err),
        origin,
      });

      if (onError) {
        onError(err);
      } else {
        logError(new Error('Failed to update alert enrichment'));
        notifyApp.error(
          t('alert-enrichment.update-error', 'Failed to update alert enrichment'),
          stringifyErrorLike(err)
        );
      }
    }
  };

  return {
    updateEnrichment,
    isLoading,
  };
}

export function getInitialFormData(enrichment?: AlertEnrichment): AlertEnrichmentFormData {
  const scope = enrichment?.spec ? determineScope(enrichment.spec) : 'global';

  let step = enrichment?.spec?.steps?.[0] || {
    timeout: DEFAULT_ENRICHMENT_TIMEOUT,
    type: 'enricher',
    enricher: createDefaultEnricherConfig('assign'),
  };

  // Fix for existing enrichments with missing dataSource.type field
  // If enricher is dsquery and dataSource.type is empty or missing, default to 'raw'
  if (step.enricher?.type === 'dsquery' && step.enricher.dataSource) {
    if (!step.enricher.dataSource.type) {
      step = {
        ...step,
        enricher: {
          ...step.enricher,
          dataSource: {
            ...step.enricher.dataSource,
            type: 'raw',
          },
        },
      };
    }
  }

  return {
    scope,
    title: enrichment?.spec?.title || '',
    description: enrichment?.spec?.description || '',
    steps: [step],
    labelMatchers: enrichment?.spec?.labelMatchers || [],
    annotationMatchers: enrichment?.spec?.annotationMatchers || [],
    alertRuleUids: enrichment?.spec?.alertRuleUids || [],
  };
}

export function getMatcherTypeOptions() {
  return [
    { label: t('alert-enrichment-form.matcher-type.equals', 'Equals (=)'), value: '=' },
    { label: t('alert-enrichment-form.matcher-type.not-equals', 'Not Equals (!=)'), value: '!=' },
    { label: t('alert-enrichment-form.matcher-type.regex-match', 'Regex Match (=~)'), value: '=~' },
    { label: t('alert-enrichment-form.matcher-type.regex-not-match', 'Regex Not Match (!~)'), value: '!~' },
  ];
}

export function getEnricherTypeOptions(): Array<ComboboxOption<EnrichmentType>> {
  const options: Array<ComboboxOption<EnrichmentType>> = [
    {
      label: t('enricher.dsquery.label', 'Data Source Query'),
      value: 'dsquery',
      description: t('enricher.dsquery.description', 'Query data sources for additional context'),
    },
    {
      label: t('enricher.assign.label', 'Assign'),
      value: 'assign',
      description: t('enricher.assign.description', 'Add annotations to alerts'),
    },
    {
      label: t('enricher.external.label', 'External'),
      value: 'external',
      description: t('enricher.external.description', 'Call external webhook for enrichment'),
    },
    {
      label: t('enricher.asserts.label', 'RCA Workbench'),
      value: 'asserts',
      description: t('enricher.asserts.description', 'Add a link to the RCA Workbench in alert notifications'),
    },
    {
      label: t('enricher.sift.label', 'Sift'),
      value: 'sift',
      description: t('enricher.sift.description', 'Run Sift investigation'),
    },
    {
      label: t('enricher.explain.label', 'Explain'),
      value: 'explain',
      description: t('enricher.explain.description', 'Generate AI-powered explanations for alerts'),
    },
  ];

  const toggleKey: keyof FeatureToggles = 'alertingEnrichmentAssistantInvestigations';
  if (config.featureToggles[toggleKey]) {
    options.push({
      label: t('enricher.assistant.label', 'Assistant Investigations'),
      value: 'assistant' as const,
      description: t('enricher.assistant.description', 'Start Assistant Investigation for alerts'),
    });
  }

  return options;
}

/**
 * Returns the user-facing display label for an enricher type (e.g. "asserts" -> "RCA Workbench").
 */
export function getEnricherTypeDisplayLabel(type: EnrichmentType): string {
  const option = getEnricherTypeOptions().find((opt) => opt.value === type);
  return option?.label ?? type;
}

/**
 * Determines the scope of the enrichment based on the presence of matchers
 */
function determineScope(enrichmentSpec: AlertEnrichmentSpec): EnrichmentScope {
  if (enrichmentSpec.labelMatchers && enrichmentSpec.labelMatchers.length > 0) {
    return 'label';
  }
  if (enrichmentSpec.annotationMatchers && enrichmentSpec.annotationMatchers.length > 0) {
    return 'annotation';
  }
  return 'global';
}

/**
 * Processes AlertEnrichmentFormData and cleans it based on scope settings.
 * When scope is 'global' (all alerts), both labelMatchers and annotationMatchers are cleared.
 */
export function formDataToEnrichmentSpec(formData: AlertEnrichmentFormData): AlertEnrichmentSpec {
  const scope = formData.scope;

  return {
    title: formData.title,
    description: formData.description,
    steps: formData.steps,
    // Only save matchers for selected scope
    labelMatchers: scope === 'label' ? formData.labelMatchers : undefined,
    annotationMatchers: scope === 'annotation' ? formData.annotationMatchers : undefined,
    alertRuleUids: formData.alertRuleUids,
  };
}

/**
 * Creates a default EnricherConfig for a given enrichment type.
 * Each enricher type requires its type-specific field to be present (even if empty),
 * otherwise the backend rejects the payload.
 */
export function createDefaultEnricherConfig(enrichmentType: EnrichmentType): EnricherConfig {
  switch (enrichmentType) {
    case 'dsquery':
      return {
        type: 'dsquery',
        dataSource: {
          type: 'raw',
          raw: {
            request: { queries: [{ refId: 'A' }] },
            refId: 'A',
          },
        },
      };
    case 'asserts':
      return { type: 'asserts', asserts: {} };
    case 'assign':
      return { type: 'assign', assign: { annotations: [{ name: '', value: '' }] } };
    case 'assistant':
      return { type: 'assistant', assistant: {} };
    case 'explain':
      return { type: 'explain', explain: { annotation: '' } };
    case 'external':
      return { type: 'external', external: { url: '' } };
    case 'loop':
      return { type: 'loop', loop: {} };
    case 'sift':
      return { type: 'sift', sift: {} };
    case 'querySample':
      return { type: 'querySample', querySample: {} };
  }
}

export function getInitialFormDataForType(enrichmentType: EnrichmentType): AlertEnrichmentFormData {
  return {
    scope: 'global',
    title: '',
    description: '',
    steps: [
      {
        timeout: DEFAULT_ENRICHMENT_TIMEOUT,
        type: 'enricher',
        enricher: createDefaultEnricherConfig(enrichmentType),
      },
    ],
    labelMatchers: [],
    annotationMatchers: [],
  };
}
