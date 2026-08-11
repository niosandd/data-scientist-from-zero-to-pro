import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAsync } from 'react-use';

import { t } from '@grafana/i18n';
import { Button, Drawer, Stack, Text } from '@grafana/ui';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';

import {
  getInitialFormDataForType,
  getInitialFormData,
  getEnricherTypeOptions,
  formDataToEnrichmentSpec,
  type AlertEnrichmentFormData,
  useEnrichmentCreation,
  type EnrichmentType,
} from '../form/form';

import { EnrichmentCreateForm } from './EnrichmentCreateForm';
import { EnrichmentDrawerContentWithPreview } from './EnrichmentDrawerContentWithPreview';
import { EnrichmentTypeSelector } from './EnrichmentTypeSelector';

export interface EnrichmentCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided (rule page), enrichment is rule-scoped. When omitted (settings), form shows scope: global/label/annotation. */
  ruleUid?: string;
  onSuccess?: () => void;
}

export function EnrichmentCreateDrawer({ isOpen, onClose, ruleUid, onSuccess }: EnrichmentCreateDrawerProps) {
  const step1Title = useMemo(() => t('alerting.enrichment.create-drawer.title', 'Create enrichment'), []);
  const step1Subtitle = useMemo(
    () => t('alerting.enrichment.create-drawer.step1-subtitle', 'Select an enrichment type'),
    []
  );
  const changeTypeLabel = useMemo(
    () => t('alerting.enrichment.create-drawer.change-type', 'Change enrichment type'),
    []
  );

  const [step, setStep] = useState<1 | 2>(1);
  const { value: llmEnabled } = useAsync(isLLMPluginEnabled);

  const form = useForm<AlertEnrichmentFormData>({
    defaultValues: getInitialFormData(),
  });

  const { createEnrichment, isLoading: isCreating } = useEnrichmentCreation('enrichmentContent', () => {
    onClose();
    onSuccess?.();
  });

  // Reset to step 1 when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      form.reset(getInitialFormData());
    }
  }, [isOpen, form]);

  const handleTypeSelect = (type: EnrichmentType) => {
    const formData = getInitialFormDataForType(type);
    if (ruleUid) {
      formData.alertRuleUids = [ruleUid];
    }
    form.reset(formData);
    setStep(2);
  };

  const handleChangeType = () => {
    setStep(1);
    form.reset(getInitialFormData());
  };

  const handleCancel = () => {
    onClose();
  };

  const handleSubmit = async (data: AlertEnrichmentFormData) => {
    await createEnrichment(data);
  };

  const enricherType = useWatch({ control: form.control, name: 'steps.0.enricher.type', defaultValue: undefined });
  const enricherTypeOptions = useMemo(() => getEnricherTypeOptions(), []);
  const selectedTypeOption = enricherTypeOptions.find((opt) => opt.value === enricherType);
  const enricherTypeLabel = selectedTypeOption?.label ?? String(enricherType ?? '');
  const enricherTypeDescription = selectedTypeOption?.description;
  const step2Title = useMemo(
    () => t('alerting.enrichment.create-drawer.step2-title', 'New {{type}} enrichment', { type: enricherTypeLabel }),
    [enricherTypeLabel]
  );

  if (!isOpen) {
    return null;
  }

  const drawerTitle =
    step === 1 ? (
      step1Title
    ) : (
      <Stack direction="column" gap={0.5}>
        <Stack direction="row" alignItems="baseline" gap={2} wrap="wrap">
          <Text variant="h3" weight="medium" truncate>
            {step2Title}
          </Text>
          <Button
            type="button"
            variant="secondary"
            fill="text"
            size="sm"
            onClick={handleChangeType}
            aria-label={changeTypeLabel}
          >
            {changeTypeLabel}
          </Button>
        </Stack>
        {enricherTypeDescription && (
          <Text variant="bodySmall" color="secondary">
            {enricherTypeDescription}
          </Text>
        )}
      </Stack>
    );
  const subtitle = step === 1 ? step1Subtitle : undefined;

  return (
    <Drawer title={drawerTitle} subtitle={subtitle} size="md" onClose={onClose}>
      {step === 1 ? (
        <EnrichmentTypeSelector onSelect={handleTypeSelect} />
      ) : (
        <EnrichmentDrawerContentWithPreview
          ruleUid={ruleUid}
          getEnrichmentSpec={() => formDataToEnrichmentSpec(form.getValues())}
        >
          <EnrichmentCreateForm
            form={form}
            llmEnabled={llmEnabled ?? false}
            mode="create"
            isSubmitting={isCreating}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            showScopeSection={!ruleUid}
          />
        </EnrichmentDrawerContentWithPreview>
      )}
    </Drawer>
  );
}
