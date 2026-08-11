import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAsync } from 'react-use';

import { t } from '@grafana/i18n';
import { Drawer } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';
import { ProvisioningAlert, ProvisionedResource } from 'app/features/alerting/unified/components/Provisioning';
import { EnrichmentAction, useEnrichmentAbility } from 'app/features/alerting/unified/hooks/useAbilities';
import { isK8sEntityProvisioned } from 'app/features/alerting/unified/utils/k8s/utils';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';

import {
  getInitialFormData,
  type AlertEnrichmentFormData,
  useEnrichmentUpdate,
  formDataToEnrichmentSpec,
} from '../form/form';

import { EnrichmentCreateForm } from './EnrichmentCreateForm';
import { EnrichmentDrawerContentWithPreview } from './EnrichmentDrawerContentWithPreview';

export interface EnrichmentEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  enrichment: AlertEnrichment | null;
  onSuccess?: () => void;
}

export function EnrichmentEditDrawer({ isOpen, onClose, enrichment, onSuccess }: EnrichmentEditDrawerProps) {
  const { value: llmEnabled } = useAsync(isLLMPluginEnabled);
  const [, canWrite] = useEnrichmentAbility(EnrichmentAction.Write);

  const form = useForm<AlertEnrichmentFormData>({
    defaultValues: getInitialFormData(),
  });

  const { updateEnrichment, isLoading: isUpdating } = useEnrichmentUpdate('enrichmentContent', () => {
    onClose();
    onSuccess?.();
  });

  const enrichmentIsProvisioned = enrichment ? isK8sEntityProvisioned(enrichment) : false;
  const isReadOnly = !canWrite || enrichmentIsProvisioned;
  const title = useMemo(
    () =>
      isReadOnly
        ? t('alerting.enrichment.drawer.view-section', 'View enrichment')
        : t('alerting.enrichment.drawer.edit-section', 'Edit enrichment'),
    [isReadOnly]
  );

  useEffect(() => {
    if (isOpen && enrichment) {
      form.reset(getInitialFormData(enrichment));
    }
  }, [isOpen, enrichment, form]);

  const handleSubmit = async (data: AlertEnrichmentFormData) => {
    if (!enrichment) {
      return;
    }
    await updateEnrichment(enrichment, data);
  };

  if (!isOpen || !enrichment) {
    return null;
  }

  const ruleUid = enrichment.spec?.alertRuleUids?.[0];

  return (
    <Drawer title={title} size="md" onClose={onClose}>
      <EnrichmentDrawerContentWithPreview
        ruleUid={ruleUid}
        getEnrichmentSpec={() => formDataToEnrichmentSpec(form.getValues())}
      >
        <EnrichmentCreateForm
          form={form}
          llmEnabled={llmEnabled ?? false}
          mode="edit"
          isSubmitting={isUpdating}
          onCancel={onClose}
          onSubmit={handleSubmit}
          isReadOnly={isReadOnly}
          showScopeSection
          provisioningAlert={
            enrichmentIsProvisioned ? <ProvisioningAlert resource={ProvisionedResource.AlertEnrichment} /> : undefined
          }
        />
      </EnrichmentDrawerContentWithPreview>
    </Drawer>
  );
}
