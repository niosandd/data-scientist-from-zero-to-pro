import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAsync } from 'react-use';

import { t } from '@grafana/i18n';
import { Drawer } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';

import { getInitialFormData, type AlertEnrichmentFormData } from '../form/form';

import { EnrichmentCreateForm } from './EnrichmentCreateForm';
import { EnrichmentDrawerContentWithPreview } from './EnrichmentDrawerContentWithPreview';

export interface EnrichmentReadOnlyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  enrichment: AlertEnrichment | null;
}

export function EnrichmentReadOnlyDrawer({ isOpen, onClose, enrichment }: EnrichmentReadOnlyDrawerProps) {
  const { value: llmEnabled } = useAsync(isLLMPluginEnabled);
  const fallbackTitle = useMemo(() => t('alerting.enrichment.drawer.view-section', 'View enrichment'), []);

  const form = useForm<AlertEnrichmentFormData>({
    defaultValues: getInitialFormData(),
  });

  useEffect(() => {
    if (isOpen && enrichment) {
      form.reset(getInitialFormData(enrichment));
    }
  }, [isOpen, enrichment, form]);

  if (!isOpen || !enrichment) {
    return null;
  }

  const drawerTitle = enrichment.spec?.title || enrichment.metadata?.name || fallbackTitle;
  const ruleUid = enrichment.spec?.alertRuleUids?.[0];

  return (
    <Drawer title={drawerTitle} size="md" onClose={onClose}>
      <EnrichmentDrawerContentWithPreview ruleUid={ruleUid} enrichmentSpec={enrichment.spec}>
        <EnrichmentCreateForm
          form={form}
          llmEnabled={llmEnabled ?? false}
          mode="edit"
          isSubmitting={false}
          onCancel={onClose}
          onSubmit={async () => {}}
          isReadOnly={true}
          showScopeSection
        />
      </EnrichmentDrawerContentWithPreview>
    </Drawer>
  );
}
