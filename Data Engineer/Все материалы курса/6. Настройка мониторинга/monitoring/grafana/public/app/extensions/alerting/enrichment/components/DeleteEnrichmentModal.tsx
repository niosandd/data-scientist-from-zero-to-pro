import { type ComponentType } from 'react';

import { t, Trans } from '@grafana/i18n';
import { ConfirmModal } from '@grafana/ui';
import type { AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';

export interface DeleteEnrichmentModalProps {
  enrichment: AlertEnrichment;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const DeleteEnrichmentModal: ComponentType<DeleteEnrichmentModalProps> = ({
  enrichment,
  onConfirm,
  onDismiss,
}) => {
  return (
    <ConfirmModal
      isOpen={!!enrichment}
      title={t('alerting.enrichment.delete.title', 'Delete alert enrichment')}
      body={
        <Trans
          i18nKey="alerting.enrichment.delete.body"
          values={{ name: enrichment.spec?.title || enrichment.metadata?.name }}
        >
          Are you sure you want to delete the alert enrichment <strong>{'{{name}}'}</strong>?
        </Trans>
      }
      confirmText={t('alerting.enrichment.delete.confirm', 'Delete')}
      dismissText={t('alerting.enrichment.delete.dismiss', 'Cancel')}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    />
  );
};
