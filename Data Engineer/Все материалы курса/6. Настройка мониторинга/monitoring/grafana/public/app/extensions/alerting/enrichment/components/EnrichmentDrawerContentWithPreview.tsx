import { type ReactNode } from 'react';

import { config } from '@grafana/runtime';
import { Divider, Stack } from '@grafana/ui';

import type { AlertEnrichmentSpec } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnrichmentPreviewSection } from './EnrichmentPreviewSection';

export interface EnrichmentDrawerContentWithPreviewProps {
  children?: ReactNode;
  ruleUid?: string;
  getEnrichmentSpec?: () => AlertEnrichmentSpec | null;
  enrichmentSpec?: AlertEnrichmentSpec;
}

/**
 * Wraps drawer content (form) with an optional enrichment preview section.
 */
export function EnrichmentDrawerContentWithPreview({
  children,
  ruleUid,
  getEnrichmentSpec,
  enrichmentSpec,
}: EnrichmentDrawerContentWithPreviewProps) {
  const isPreviewEnabled = config.featureToggles.alertEnrichmentPreview;
  const canShowPreview = Boolean(ruleUid && isPreviewEnabled);

  return (
    <Stack direction="column" gap={3}>
      {children ?? null}
      {canShowPreview && ruleUid && (
        <>
          <Divider />
          <EnrichmentPreviewSection
            ruleUid={ruleUid}
            getEnrichmentSpec={getEnrichmentSpec}
            enrichmentSpec={enrichmentSpec}
          />
        </>
      )}
    </Stack>
  );
}
