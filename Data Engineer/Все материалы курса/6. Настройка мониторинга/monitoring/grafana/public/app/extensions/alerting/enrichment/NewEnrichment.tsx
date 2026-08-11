import { useEffect } from 'react';
import { useAsync } from 'react-use';

import { type NavModelItem } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { Stack } from '@grafana/ui';
import { AlertingPageWrapper } from 'app/features/alerting/unified/components/AlertingPageWrapper';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';

import { enrichmentNav } from '../navigation';

import { trackEnrichmentCreationStarted } from './analytics/Analytics';
import { AlertEnrichmentForm } from './form/AlertEnrichmentForm';
import { type AlertEnrichmentFormData, useEnrichmentCreation } from './form/form';
import { useNewEnrichmentNavModel } from './navigation';

function NewEnrichment() {
  const pageNav: NavModelItem = useNewEnrichmentNavModel();

  const { value: llmEnabled } = useAsync(isLLMPluginEnabled);

  const { createEnrichment, isLoading } = useEnrichmentCreation('enrichmentForm', () => {
    // Redirect to enrichments list page after successful creation
    locationService.push(enrichmentNav.list);
  });

  // Track when the creation form is started
  useEffect(() => {
    trackEnrichmentCreationStarted();
  }, []);

  const onSubmit = async (formData: AlertEnrichmentFormData) => {
    await createEnrichment(formData);
  };

  const onCancel = () => {
    // Navigate back to enrichments list page
    locationService.push(enrichmentNav.list);
  };

  return (
    <AlertingPageWrapper navId="alerting-admin" pageNav={pageNav}>
      <Stack direction="column" gap={2}>
        <AlertEnrichmentForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} llmEnabled={!!llmEnabled} />
      </Stack>
    </AlertingPageWrapper>
  );
}

export default NewEnrichment;
