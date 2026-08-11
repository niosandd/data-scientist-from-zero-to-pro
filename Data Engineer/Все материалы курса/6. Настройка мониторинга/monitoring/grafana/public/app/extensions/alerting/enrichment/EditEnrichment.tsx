import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom-v5-compat';

import { type NavModelItem } from '@grafana/data';
import { t } from '@grafana/i18n';
import { locationService } from '@grafana/runtime';
import { Alert } from '@grafana/ui';
import { EntityNotFound } from 'app/core/components/PageNotFound/EntityNotFound';
import { AlertingPageWrapper } from 'app/features/alerting/unified/components/AlertingPageWrapper';
import { stringifyErrorLike } from 'app/features/alerting/unified/utils/misc';

import { generatedAPI } from '../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import { enrichmentNav } from '../navigation';

import { EnrichmentEditDrawer } from './components/EnrichmentEditDrawer';
import { useEditEnrichmentNavModel } from './navigation';

function EditEnrichment() {
  const { enrichmentK8sName } = useParams<{ enrichmentK8sName: string }>();
  const pageNav: NavModelItem = useEditEnrichmentNavModel(enrichmentK8sName);

  const {
    data: enrichment,
    isLoading,
    error,
  } = generatedAPI.useGetAlertEnrichmentQuery(enrichmentK8sName ? { name: enrichmentK8sName } : skipToken);

  const handleClose = () => {
    locationService.push(enrichmentNav.list);
  };

  if (error) {
    return (
      <AlertingPageWrapper navId="alerting-admin" pageNav={pageNav}>
        <Alert severity="error" title={t('alerting.enrichment.load-error', 'Failed to load enrichment')}>
          {stringifyErrorLike(error)}
        </Alert>
      </AlertingPageWrapper>
    );
  }

  if (!isLoading && !enrichment) {
    return (
      <AlertingPageWrapper navId="alerting-admin" pageNav={pageNav}>
        <EntityNotFound entity="Alert Enrichment" />
      </AlertingPageWrapper>
    );
  }

  return (
    <AlertingPageWrapper navId="alerting-admin" pageNav={pageNav} isLoading={isLoading}>
      {enrichment && (
        <EnrichmentEditDrawer isOpen={true} onClose={handleClose} enrichment={enrichment} onSuccess={handleClose} />
      )}
    </AlertingPageWrapper>
  );
}

export default EditEnrichment;
