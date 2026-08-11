import { type ComponentType, type ReactNode, useCallback } from 'react';

import { t, Trans } from '@grafana/i18n';
import { Stack, Text, Box, InteractiveTable, type Column, Button, useStyles2 } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';
import { ProvisioningBadge } from 'app/features/alerting/unified/components/Provisioning';
import { K8sAnnotations } from 'app/features/alerting/unified/utils/k8s/constants';
import { isK8sEntityProvisioned, getAnnotation } from 'app/features/alerting/unified/utils/k8s/utils';

import { getEnricherTypeDisplayLabel } from '../form/form';
import { getClickableTitleStyles } from '../styles';

export interface EnrichmentSectionProps {
  title: string;
  subtitle: string;
  enrichments: AlertEnrichment[];
  showActions: boolean;
  emptyStateMessage: string;
  showSectionHeader?: boolean;
  /** Renders between subtitle and the enrichment list (e.g. Add button) */
  headerAction?: ReactNode;
  canWrite?: boolean; // RBAC permission to write/edit enrichments
  onEdit?: (enrichment: AlertEnrichment) => void;
  onDelete?: (enrichment: AlertEnrichment) => void;
  onRowClick?: (enrichment: AlertEnrichment) => void;
}

export const EnrichmentSection: ComponentType<EnrichmentSectionProps> = ({
  title,
  subtitle,
  enrichments,
  showActions,
  emptyStateMessage,
  showSectionHeader = true,
  headerAction,
  canWrite = true, // Default to true for backward compatibility
  onEdit,
  onDelete,
  onRowClick,
}) => {
  const styles = useStyles2(getClickableTitleStyles);

  const handleEdit = useCallback(
    (enrichment: AlertEnrichment) => {
      onEdit?.(enrichment);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (enrichment: AlertEnrichment) => {
      onDelete?.(enrichment);
    },
    [onDelete]
  );

  const createColumns = (showActionsLocal: boolean): Array<Column<AlertEnrichment>> => [
    {
      id: 'name',
      header: t('alerting.enrichment.table.enrichment', 'Enrichment'),
      cell: ({ row }) => {
        const enrichment = row.original;
        const spec = enrichment.spec;
        const enricherType = spec?.steps?.[0]?.enricher?.type;
        const title = enrichment.spec?.title || enrichment.metadata?.name || '<no title>';

        return (
          <Stack direction="column" gap={0}>
            <Stack direction="row" alignItems="center" gap={1}>
              {onRowClick ? (
                <button
                  type="button"
                  className={styles.clickableTitle}
                  onClick={() => onRowClick(enrichment)}
                  aria-label={t('alerting.enrichment.drawer.view-aria-label', 'View enrichment')}
                >
                  <Text color="primary" element="span">
                    {title}
                  </Text>
                </button>
              ) : (
                <Text color="primary">{title}</Text>
              )}
            </Stack>
            {enrichment.spec?.description && (
              <Text variant="bodySmall" color="secondary" truncate>
                {enrichment.spec.description}
              </Text>
            )}
            {enricherType && (
              <Text variant="bodySmall" color="secondary">
                {getEnricherTypeDisplayLabel(enricherType)}
              </Text>
            )}
          </Stack>
        );
      },
    },
    {
      id: 'status',
      header: '',
      disableGrow: true,
      cell: ({ row }) => {
        const enrichment = row.original;
        const enrichmentIsProvisioned = isK8sEntityProvisioned(enrichment);
        const provenance = getAnnotation(enrichment, K8sAnnotations.Provenance);

        return (
          <Box paddingX={2} paddingY={1}>
            {enrichmentIsProvisioned && <ProvisioningBadge tooltip provenance={provenance} />}
          </Box>
        );
      },
    },
    ...(showActionsLocal
      ? [
          {
            id: 'actions',
            header: <span className={styles.actionsHeader}>{t('alerting.enrichment.table.actions', 'Actions')}</span>,
            disableGrow: true,
            cell: ({ row }: { row: { original: AlertEnrichment } }) => {
              const enrichment = row.original;
              const enrichmentIsProvisioned = isK8sEntityProvisioned(enrichment);
              // Enrichment is editable only if user has write permission AND enrichment is not provisioned
              const isEditable = canWrite && !enrichmentIsProvisioned;

              return (
                <Box paddingX={2} paddingY={1}>
                  <Stack direction="row" gap={2}>
                    <Button
                      variant="secondary"
                      icon={isEditable ? 'pen' : 'eye'}
                      size="sm"
                      fill="text"
                      onClick={() => handleEdit(enrichment)}
                      aria-label={
                        isEditable
                          ? t('alerting.enrichment.drawer.edit-aria-label', 'Edit enrichment')
                          : t('alerting.enrichment.drawer.view-aria-label', 'View enrichment')
                      }
                    >
                      {isEditable ? (
                        <Trans i18nKey="alerting.enrichment.drawer.edit-button">Edit</Trans>
                      ) : (
                        <Trans i18nKey="alerting.enrichment.drawer.view-button">View</Trans>
                      )}
                    </Button>
                    {isEditable && (
                      <Button
                        variant="secondary"
                        icon="trash-alt"
                        size="sm"
                        fill="text"
                        onClick={() => handleDelete(enrichment)}
                        aria-label={t('alerting.enrichment.drawer.delete-aria-label', 'Delete enrichment')}
                      >
                        <Trans i18nKey="alerting.enrichment.drawer.delete-button">Delete</Trans>
                      </Button>
                    )}
                  </Stack>
                </Box>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <Stack direction="column" gap={2}>
      {showSectionHeader && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" wrap="wrap" gap={2}>
          <Text variant="h4" weight="medium">
            {title}
          </Text>
          {headerAction}
        </Stack>
      )}
      {!showSectionHeader && headerAction}
      {subtitle && (
        <Text variant="body" color="secondary">
          {subtitle}
        </Text>
      )}
      {enrichments.length > 0 ? (
        <InteractiveTable
          columns={createColumns(showActions)}
          data={enrichments}
          getRowId={(row) => `enrichment-${row.metadata?.name || ''}`}
          pageSize={0}
        />
      ) : (
        <Box
          padding={3}
          backgroundColor="secondary"
          borderRadius="default"
          borderStyle="dashed"
          borderColor="weak"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="bodySmall" color="secondary" textAlignment="center">
            {emptyStateMessage}
          </Text>
        </Box>
      )}
    </Stack>
  );
};
