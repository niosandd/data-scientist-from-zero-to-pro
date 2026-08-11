import { css } from '@emotion/css';
import { useEffect, useMemo, useState } from 'react';

import {
  type CreateNotificationqueryNotificationEntry,
  type CreateNotificationsqueryalertsNotificationEntryAlert,
  useCreateNotificationqueryMutation,
} from '@grafana/api-clients/rtkq/historian.alerting/v0alpha1';
import { dateTime, type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { Alert, Button, CodeEditor, Collapse, Stack, Text, useStyles2 } from '@grafana/ui';
import { useNotificationAlerts } from 'app/features/alerting/unified/hooks/useNotificationAlerts';
import { stringifyErrorLike } from 'app/features/alerting/unified/utils/misc';

import { usePreviewEnrichmentMutation } from '../../../api/clients/alertenrichment/v1beta1';
import type { AlertEnrichmentSpec } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import type {
  NotificationAlert,
  PreviewEnrichmentResponse,
} from '../../../api/clients/alertenrichment/v1beta1/previewTypes';

const NOTIFICATION_LOOKBACK_DAYS = 30;
const NOTIFICATION_PAGE_SIZE = 50;

const RULE_UID_LABEL = '__alert_rule_uid__';

/**
 * Filters alerts to those that match the enrichment spec's scope so the enricher applies the pipeline.
 * The enricher expects alerts for the enrichment's rule scope; we filter before sending so the preview
 * request only includes alerts that the enrichment would actually run against.
 */
function filterAlertsByEnrichmentScope(
  alerts: CreateNotificationsqueryalertsNotificationEntryAlert[],
  spec: AlertEnrichmentSpec
): CreateNotificationsqueryalertsNotificationEntryAlert[] {
  const ruleUids = spec.alertRuleUids;
  if (!Array.isArray(ruleUids) || ruleUids.length === 0) {
    return alerts;
  }
  const set = new Set(ruleUids);
  const filtered = alerts.filter((a) => {
    const uid = a.labels?.[RULE_UID_LABEL];
    return uid != null && set.has(uid);
  });
  return filtered;
}

function serializeAlertsToPayload(alerts: CreateNotificationsqueryalertsNotificationEntryAlert[]): NotificationAlert[] {
  return alerts.map((a) => ({
    labels: a.labels ?? {},
    annotations: a.annotations ?? {},
    status: a.status,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
  }));
}

export interface EnrichmentPreviewSectionProps {
  /** When provided, notification picker and preview are enabled. When omitted (e.g. settings create), section shows message. */
  ruleUid?: string;
  /** Enrichment spec to run (read-only: pass enrichment.spec). */
  enrichmentSpec?: AlertEnrichmentSpec;
  /** When in create/edit form, call this to get current spec from form state at preview time. */
  getEnrichmentSpec?: () => AlertEnrichmentSpec | null;
}

/** Preview error with optional collapsible details so the raw error is not lost. */
function PreviewErrorAlert({ errorMessage, styles }: { errorMessage: string; styles: ReturnType<typeof getStyles> }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const is500 = errorMessage.includes('500');
  const displayMessage = is500
    ? t('alerting.enrichment.preview.error-500', 'Server error (500). Please try again later.')
    : errorMessage;

  return (
    <Alert severity="error" title={t('alerting.enrichment.preview.error-title', 'Preview failed')}>
      <Stack direction="column" gap={1}>
        <div className={styles.previewErrorContent}>{displayMessage}</div>
        <Collapse
          className={styles.detailsCollapse}
          label={t('alerting.enrichment.preview.error-details', 'Details')}
          isOpen={detailsOpen}
          onToggle={setDetailsOpen}
        >
          <div className={styles.previewErrorContent}>{errorMessage}</div>
        </Collapse>
      </Stack>
    </Alert>
  );
}

/** Inner component that only mounts when we have a selected entry, so useNotificationAlerts gets valid uuid/timestamp. */
function PreviewWithAlerts({
  selectedEntry,
  enrichmentSpecProp,
  getEnrichmentSpec,
}: {
  selectedEntry: CreateNotificationqueryNotificationEntry;
  enrichmentSpecProp?: AlertEnrichmentSpec;
  getEnrichmentSpec?: () => AlertEnrichmentSpec | null;
}) {
  const { alerts, isLoading: alertsLoading } = useNotificationAlerts(selectedEntry.uuid, selectedEntry.timestamp);
  const getSpec = (): AlertEnrichmentSpec | null => getEnrichmentSpec?.() ?? enrichmentSpecProp ?? null;
  return <PreviewActions alerts={alerts} alertsLoading={alertsLoading} getSpec={getSpec} />;
}

function PreviewActions({
  alerts,
  alertsLoading,
  getSpec,
}: {
  alerts: CreateNotificationsqueryalertsNotificationEntryAlert[];
  alertsLoading: boolean;
  getSpec: () => AlertEnrichmentSpec | null;
}) {
  const styles = useStyles2(getStyles);
  const [triggerPreview, { data: previewData, error: previewError, isLoading: previewLoading }] =
    usePreviewEnrichmentMutation();

  const spec = getSpec();
  const alertsForPreview = spec ? filterAlertsByEnrichmentScope(alerts, spec) : [];
  const isRuleScoped = Boolean(spec?.alertRuleUids?.length);
  const noMatchingAlerts = isRuleScoped && alerts.length > 0 && alertsForPreview.length === 0;
  const canPreview = alertsForPreview.length > 0 && spec && !previewLoading;

  const previewResult: PreviewEnrichmentResponse | undefined = previewData;
  const previewResultJson = useMemo(
    () => (previewResult != null ? JSON.stringify(previewResult, null, 2) : ''),
    [previewResult]
  );
  const hasPreviewResult = previewResultJson.length > 0;
  const errorMessage = previewError ? stringifyErrorLike(previewError) : null;

  return (
    <Stack direction="column" gap={2}>
      {alertsLoading && <Trans i18nKey="alerting.enrichment.preview.loading-alerts">Loading alert payload...</Trans>}
      {noMatchingAlerts && (
        <Alert severity="info" title={t('alerting.enrichment.preview.no-matching-alerts-title', 'No matching alerts')}>
          <Trans i18nKey="alerting.enrichment.preview.no-matching-alerts">
            No matching alerts found for this rule.
          </Trans>
        </Alert>
      )}
      {!alertsLoading && alerts.length > 0 && !noMatchingAlerts && (
        <Stack direction="row" alignItems="center" gap={1}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon="play"
            onClick={() => {
              if (spec && alertsForPreview.length > 0) {
                triggerPreview({
                  enrichmentSpec: spec,
                  notificationPayload: serializeAlertsToPayload(alertsForPreview),
                });
              }
            }}
            disabled={!canPreview}
          >
            <Trans i18nKey="alerting.enrichment.preview.run">Preview enrichment</Trans>
          </Button>
        </Stack>
      )}
      {errorMessage && <PreviewErrorAlert errorMessage={errorMessage} styles={styles} />}
      {hasPreviewResult && (
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <Trans i18nKey="alerting.enrichment.preview.result-label">Preview result</Trans>
          </div>
          <CodeEditor
            value={previewResultJson}
            language="json"
            showLineNumbers={false}
            showMiniMap={false}
            readOnly
            height="200px"
            monacoOptions={{ scrollBeyondLastLine: false }}
          />
        </div>
      )}
    </Stack>
  );
}

/** Notification history load error with short message and collapsible details. */
function NotificationHistoryErrorBlock({ error }: { error: unknown }) {
  const styles = useStyles2(getStyles);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const errorDetail = error != null ? stringifyErrorLike(error) : '';

  return (
    <Stack direction="column" gap={1}>
      <Text variant="bodySmall" color="secondary">
        <Trans i18nKey="alerting.enrichment.preview.error-loading-unavailable">
          Preview is unavailable. Notification history could not be loaded.
        </Trans>
      </Text>
      {errorDetail !== '' && (
        <Collapse
          className={styles.detailsCollapse}
          label={t('alerting.enrichment.preview.error-details', 'Details')}
          isOpen={detailsOpen}
          onToggle={setDetailsOpen}
        >
          <div className={styles.previewErrorContent}>{errorDetail}</div>
        </Collapse>
      )}
    </Stack>
  );
}

/** Fetches notification history for the rule and uses the latest entry for live preview. No picker. */
function LivePreviewBlock({
  ruleUid,
  enrichmentSpecProp,
  getEnrichmentSpec,
}: {
  ruleUid: string;
  enrichmentSpecProp?: AlertEnrichmentSpec;
  getEnrichmentSpec?: () => AlertEnrichmentSpec | null;
}) {
  const [createNotificationQuery, { data, isLoading, isError, error }] = useCreateNotificationqueryMutation();

  useEffect(() => {
    const fromDate = dateTime().subtract(NOTIFICATION_LOOKBACK_DAYS, 'days').toISOString();
    const toDate = dateTime().toISOString();
    createNotificationQuery({
      createNotificationqueryRequestBody: {
        ruleUID: ruleUid,
        from: fromDate,
        to: toDate,
        limit: NOTIFICATION_PAGE_SIZE,
      },
    });
  }, [ruleUid, createNotificationQuery]);

  const entries: CreateNotificationqueryNotificationEntry[] = useMemo(() => data?.entries ?? [], [data]);
  const lastEntry: CreateNotificationqueryNotificationEntry | null = entries.length > 0 ? entries[0] : null;
  const hasReceivedResponse = data !== undefined;

  if (isLoading || (!hasReceivedResponse && !isError)) {
    return (
      <Text variant="bodySmall" color="secondary">
        <Trans i18nKey="alerting.enrichment.preview.loading-notifications">Loading notifications...</Trans>
      </Text>
    );
  }

  if (isError) {
    return <NotificationHistoryErrorBlock error={error} />;
  }

  if (entries.length === 0) {
    return (
      <Text variant="bodySmall" color="secondary">
        <Trans i18nKey="alerting.enrichment.preview.no-notifications">
          No notification history for this rule. Preview will be available when the rule fires.
        </Trans>
      </Text>
    );
  }

  if (!lastEntry?.uuid) {
    return null;
  }

  return (
    <PreviewWithAlerts
      selectedEntry={lastEntry}
      enrichmentSpecProp={enrichmentSpecProp}
      getEnrichmentSpec={getEnrichmentSpec}
    />
  );
}

export function EnrichmentPreviewSection({
  ruleUid,
  enrichmentSpec: enrichmentSpecProp,
  getEnrichmentSpec,
}: EnrichmentPreviewSectionProps) {
  const hasRule = ruleUid != null && ruleUid !== '';
  if (!hasRule) {
    return null;
  }

  return (
    <Stack direction="column" gap={2}>
      <LivePreviewBlock
        ruleUid={ruleUid}
        enrichmentSpecProp={enrichmentSpecProp}
        getEnrichmentSpec={getEnrichmentSpec}
      />
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  const radius = theme.shape.radius.default;
  return {
    resultContainer: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: radius,
      overflow: 'hidden',
    }),
    resultHeader: css({
      padding: theme.spacing(1, 1.5),
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: theme.colors.background.secondary,
      borderBottom: `1px solid ${theme.colors.border.weak}`,
    }),
    previewErrorContent: css({
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      minWidth: 0,
    }),
    detailsCollapse: css({
      border: 'none',
      background: 'none',
      color: theme.colors.text.primary,
    }),
  };
};
