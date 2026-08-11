import { useMemo } from 'react';
import { useFormContext, useWatch, Controller } from 'react-hook-form';

import { t, Trans } from '@grafana/i18n';
import { Field, Combobox, Stack, Alert, Text } from '@grafana/ui';

import { AssignEnricherConfig } from './AssignEnricherConfig';
import { ExplainEnricherConfig } from './ExplainEnricherConfig';
import { ExternalEnricherConfig } from './ExternalEnricherConfig';
import { GenericEnricherConfig } from './GenericEnricherConfig';
import { QueryEnricherConfig } from './QueryEnricherConfig';
import { getEnricherTypeOptions, createDefaultEnricherConfig, type AlertEnrichmentFormData } from './form';

interface EnricherConfigSectionProps {
  llmEnabled: boolean;
  hideTypeSelector?: boolean;
  isReadOnly?: boolean;
  typeSelectorDisabled?: boolean;
}

/**
 * Shared EnricherConfigSection used by EnrichmentCreateForm (create/edit/read-only drawers) and AlertEnrichmentForm.
 */
export function EnricherConfigSection({
  llmEnabled,
  hideTypeSelector = false,
  isReadOnly = false,
  typeSelectorDisabled = false,
}: EnricherConfigSectionProps) {
  const enricherTypeOptions = useMemo(() => getEnricherTypeOptions(), []);

  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<AlertEnrichmentFormData>();
  const enricherType = useWatch({ control, name: 'steps.0.enricher.type' });
  const enricherTypeDescription = enricherTypeOptions.find((opt) => opt.value === enricherType)?.description;

  const renderEnricherConfig = () => {
    switch (enricherType) {
      case 'assign':
        return <AssignEnricherConfig stepPath="steps.0" isReadOnly={isReadOnly} />;
      case 'external':
        return <ExternalEnricherConfig stepPath="steps.0" />;
      case 'dsquery':
        return <QueryEnricherConfig stepPath="steps.0" isReadOnly={isReadOnly} />;
      case 'asserts':
        return <GenericEnricherConfig enricherType="asserts" stepPath="steps.0" />;
      case 'sift':
        return <GenericEnricherConfig enricherType="sift" stepPath="steps.0" />;
      case 'explain':
        return <ExplainEnricherConfig stepPath="steps.0" />;
      case 'assistant':
        return <GenericEnricherConfig enricherType="assistant" stepPath="steps.0" />;
      default:
        return null;
    }
  };

  const showNoLLMWarning = !llmEnabled && enricherType === 'explain';

  return (
    <Stack direction="column" gap={3}>
      {!hideTypeSelector && (
        <Stack direction="column" gap={0.5}>
          <Field
            label={t('alert-enrichment-form.enricher-config.type', 'Enricher Type')}
            required
            noMargin
            htmlFor="steps.0.enricher.type"
          >
            <Controller
              name="steps.0.enricher.type"
              control={control}
              rules={{
                required: t('alert-enrichment-form.enricher-config.type-required', 'Enricher type is required'),
              }}
              render={({ field: { ref, ...field } }) => (
                <Combobox
                  {...field}
                  id="steps.0.enricher.type"
                  options={enricherTypeOptions}
                  placeholder={t('alert-enrichment-form.enricher-config.type-placeholder', 'Select enricher type')}
                  invalid={!!errors.steps?.[0]?.enricher?.type}
                  disabled={typeSelectorDisabled}
                  onChange={({ value }) => {
                    setValue('steps.0.enricher', createDefaultEnricherConfig(value));
                  }}
                />
              )}
            />
          </Field>
          {enricherTypeDescription && (
            <Text variant="bodySmall" color="secondary">
              {enricherTypeDescription}
            </Text>
          )}
        </Stack>
      )}
      {showNoLLMWarning && (
        <Alert
          severity="warning"
          title={t('alert-enrichment-form.enricher-config.llm-disabled', 'LLM is disabled')}
          bottomSpacing={0}
        >
          <Trans i18nKey="alert-enrichment-form.enricher-config.llm-disabled-description">
            Explain enricher requires Grafana LLM plugin to be enabled
          </Trans>
        </Alert>
      )}
      {renderEnricherConfig()}
    </Stack>
  );
}
