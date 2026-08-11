import { isEmpty } from 'lodash';
import { useCallback, useEffect, useMemo } from 'react';

import { t, Trans } from '@grafana/i18n';
import {
  Box,
  Button,
  type Column,
  InteractiveTable,
  LinkButton,
  Stack,
  Text,
  type IconName,
  Tooltip,
  useStyles2,
} from '@grafana/ui';
import { MetaText } from 'app/features/alerting/unified/components/MetaText';
import { ProvisioningBadge } from 'app/features/alerting/unified/components/Provisioning';
import { K8sAnnotations } from 'app/features/alerting/unified/utils/k8s/constants';
import { isK8sEntityProvisioned, getAnnotation } from 'app/features/alerting/unified/utils/k8s/utils';

import { type AlertEnrichment, type EnricherConfig } from '../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnricherTooltip } from './EnricherTooltip';
import { Matchers } from './Matchers';
import {
  trackEnrichmentListView,
  trackEnrichmentLoadMore,
  trackEnrichmentDeleted,
  trackEnrichmentEditClicked,
} from './analytics/Analytics';
import { RuleLink } from './form/AlertEnrichmentForm';
import { getEnricherTypeDisplayLabel } from './form/form';
import { getClickableTitleStyles } from './styles';

interface EnrichmentListProps {
  enrichments: AlertEnrichment[];
  onDelete: (enrichment: AlertEnrichment) => void;
  onView: (enrichment: AlertEnrichment) => void;
  onEdit: (enrichment: AlertEnrichment) => void;
  isLoading?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  hasActiveFilters?: boolean;
}

type EnricherConfigType = EnricherConfig['type'];

export function EnrichmentList({
  enrichments,
  onDelete,
  onView,
  onEdit,
  isLoading = false,
  hasMore: hasMore,
  onLoadMore,
  hasActiveFilters = false,
}: EnrichmentListProps) {
  const styles = useStyles2(getClickableTitleStyles);
  // Track list view when component mounts or enrichments change
  useEffect(() => {
    trackEnrichmentListView({
      enrichments_count: enrichments.length,
      has_enrichments: enrichments.length > 0,
    });
  }, [enrichments.length]);

  const handleLoadMore = useCallback(() => {
    trackEnrichmentLoadMore({
      current_count: enrichments.length,
    });
    onLoadMore();
  }, [enrichments.length, onLoadMore]);

  const columns: Array<Column<AlertEnrichment>> = useMemo(() => {
    const handleDelete = (enrichment: AlertEnrichment) => {
      trackEnrichmentDeleted(enrichment);
      onDelete(enrichment);
    };

    const handleViewClick = (enrichment: AlertEnrichment) => {
      onView(enrichment);
    };

    const handleEditClick = (enrichment: AlertEnrichment) => {
      trackEnrichmentEditClicked(enrichment);
      onEdit(enrichment);
    };
    return [
      {
        id: 'name',
        header: t('alerting.enrichment.table.enrichment', 'Enrichment'),
        cell: ({ row }) => {
          const enrichment = row.original;
          const spec = enrichment.spec;
          const alertRuleUids = spec?.alertRuleUids ?? [];
          const labelMatchers = spec?.labelMatchers ?? [];
          const annotationMatchers = spec?.annotationMatchers ?? [];
          const enricherType = spec?.steps?.[0]?.enricher?.type;

          const metadata: React.ReactNode[] = [];

          // Add enricher type
          if (enricherType) {
            const enricherConfig = spec?.steps?.[0]?.enricher;

            metadata.push(
              <Tooltip content={<EnricherTooltip enricher={enricherConfig} />}>
                <MetaText icon={getEnricherTypeIcon(enricherType)}>
                  <Text variant="bodySmall" color="secondary">
                    {getEnricherTypeDisplayLabel(enricherType)}
                  </Text>
                </MetaText>
              </Tooltip>
            );
          }

          if (labelMatchers.length > 0 || annotationMatchers.length > 0 || alertRuleUids.length > 0) {
            metadata.push(
              <Stack direction="row" gap={1} alignItems="center">
                <MetaText>
                  <Text variant="bodySmall" color="primary">
                    {t('alerting.enrichment.table.annotationMatchers-scoped', 'Scoped by ')}
                  </Text>
                </MetaText>
                {labelMatchers.length > 0 && (
                  <Tooltip content={<Matchers matchers={labelMatchers} />}>
                    <MetaText icon="tag-alt">
                      <Text variant="bodySmall" color="primary">
                        {t('alerting.enrichment.table.labelMatchers', 'Labels')}
                      </Text>
                    </MetaText>
                  </Tooltip>
                )}
                {annotationMatchers.length > 0 && (
                  <Tooltip content={<Matchers matchers={annotationMatchers} />}>
                    <MetaText icon="filter">
                      <Text variant="bodySmall" color="primary">
                        {t('alerting.enrichment.table.annotationMatchers', 'Annotations')}
                      </Text>
                    </MetaText>
                  </Tooltip>
                )}
                {alertRuleUids.length > 0 && (
                  <Stack direction="row" gap={1} alignItems="center">
                    {alertRuleUids.map((ruleUid) => (
                      <RuleLink key={ruleUid} ruleUid={ruleUid} />
                    ))}
                  </Stack>
                )}
              </Stack>
            );
          }

          if (isEmpty(labelMatchers) && isEmpty(annotationMatchers) && isEmpty(alertRuleUids)) {
            metadata.push(
              <MetaText icon="globe">
                <Text variant="bodySmall" color="primary">
                  <Trans i18nKey="alerting.enrichment.appliesTo">Applies to all alerts</Trans>
                </Text>
              </MetaText>
            );
          }

          const title = enrichment.spec?.title || enrichment.metadata?.name || '<no title>';
          return (
            <Stack direction="column" gap={0}>
              {/* Title - clickable to open read-only drawer */}
              <Stack direction="row" alignItems="center" gap={1}>
                <button
                  type="button"
                  className={styles.clickableTitle}
                  onClick={() => handleViewClick(enrichment)}
                  aria-label={t('alerting.enrichment.drawer.view-aria-label', 'View enrichment')}
                >
                  <Text color="primary" element="span">
                    {title}
                  </Text>
                </button>
              </Stack>

              {/* Description */}
              {enrichment.spec?.description && (
                <Text variant="bodySmall" color="secondary" truncate>
                  {enrichment.spec.description}
                </Text>
              )}

              {/* Metadata */}
              <Stack direction="row" gap={1} alignItems="center">
                {metadata.map((item, index) => (
                  <div key={index}>{item}</div>
                ))}
              </Stack>
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
      {
        id: 'actions',
        header: <span className={styles.actionsHeader}>{t('alerting.enrichment.table.actions', 'Actions')}</span>,
        disableGrow: true,
        cell: ({ row }) => {
          const k8sName = row.original.metadata?.name;
          const enrichment = row.original;

          if (!k8sName) {
            return null;
          }

          const enrichmentIsProvisioned = isK8sEntityProvisioned(enrichment);

          return (
            <Box paddingX={2} paddingY={1}>
              <Stack direction="row" gap={2}>
                <Button
                  variant="secondary"
                  icon={enrichmentIsProvisioned ? 'eye' : 'pen'}
                  size="sm"
                  fill="text"
                  onClick={() => handleEditClick(enrichment)}
                  aria-label={
                    enrichmentIsProvisioned
                      ? t('alerting.enrichment.view-enrichment', 'View enrichment {{name}}', {
                          name: row.original.spec?.title || k8sName,
                        })
                      : t('alerting.enrichment.edit-enrichment', 'Edit enrichment {{name}}', {
                          name: row.original.spec?.title || k8sName,
                        })
                  }
                >
                  {enrichmentIsProvisioned ? (
                    <Trans i18nKey="alerting.enrichment.view-button">View</Trans>
                  ) : (
                    <Trans i18nKey="alerting.enrichment.edit-button">Edit</Trans>
                  )}
                </Button>
                {!enrichmentIsProvisioned && (
                  <Button
                    variant="secondary"
                    icon="trash-alt"
                    size="sm"
                    fill="text"
                    onClick={() => handleDelete(enrichment)}
                    aria-label={t('alerting.enrichment.delete-enrichment', 'Delete enrichment {{name}}', {
                      name: row.original.spec?.title || k8sName,
                    })}
                  >
                    <Trans i18nKey="alerting.enrichment.delete-button">Delete</Trans>
                  </Button>
                )}
              </Stack>
            </Box>
          );
        },
      },
    ];
  }, [onDelete, onEdit, onView, styles]);

  if (enrichments.length === 0) {
    return (
      <Text>
        {hasActiveFilters ? (
          <Trans i18nKey="alerting.enrichment.filter.no-matching-enrichments">No matching enrichments found.</Trans>
        ) : (
          <Trans i18nKey="alerting.enrichment.noEnrichments">No alert enrichments configured</Trans>
        )}
      </Text>
    );
  }

  // Load more button for infinite loading
  const LoadMoreButton = () => {
    return (
      <Stack direction="row" gap={1} alignItems="center" justifyContent="center">
        <LinkButton variant="secondary" onClick={handleLoadMore} icon={'angle-down'}>
          <Trans i18nKey="alerting.enrichment.loadMore">Load more</Trans>
        </LinkButton>
      </Stack>
    );
  };

  return (
    <Stack direction="column" gap={2}>
      <InteractiveTable
        columns={columns}
        data={enrichments}
        getRowId={(row) => `enrichment-${row.metadata?.name || ''}`}
        pageSize={0}
      />
      {isLoading && (
        <Text>
          <Trans i18nKey="alerting.enrichment.loading">Loading enrichments...</Trans>
        </Text>
      )}
      {!isLoading && hasMore && <LoadMoreButton />}
    </Stack>
  );
}

const enricherTypeIcon: Record<EnricherConfigType, IconName> = {
  assign: 'tag-alt',
  external: 'external-link-alt',
  dsquery: 'database',
  sift: 'search',
  asserts: 'heart-rate',
  explain: 'comment-alt',
  loop: 'repeat',
  assistant: 'ai-sparkle',
  querySample: 'chart-line',
};

function getEnricherTypeIcon(enricherType: EnricherConfigType): IconName {
  return enricherTypeIcon[enricherType] || 'cog';
}
