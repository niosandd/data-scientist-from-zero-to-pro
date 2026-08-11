import { type ComponentType } from 'react';

import { t } from '@grafana/i18n';
import { Stack, Box, Text } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnrichmentContent } from './EnrichmentContent';

export interface EnrichmentUnifiedViewProps {
  ruleLevelEnrichments: AlertEnrichment[];
  globalEnrichments: AlertEnrichment[];
  ruleUid: string;
  onDeleteEnrichment: (enrichmentId: string) => void;
  onEnrichmentCreated?: () => void;
  onEnrichmentUpdated?: () => void;
}

/**
 * Example component showing how to use EnrichmentContent without tabs.
 * This displays both rule and global enrichments in a single unified view.
 */
export const EnrichmentUnifiedView: ComponentType<EnrichmentUnifiedViewProps> = ({
  ruleLevelEnrichments,
  globalEnrichments,
  onDeleteEnrichment,
  ruleUid,
  onEnrichmentCreated,
  onEnrichmentUpdated,
}) => {
  return (
    <Box padding={2}>
      <Stack direction="column" gap={3}>
        <Text variant="body" color="secondary">
          {t(
            'alerting.enrichment.unified.description',
            'Enhance your alert notifications by running preliminary analysis and adding more context.'
          )}
        </Text>

        {/* Unified content without tabs */}
        <EnrichmentContent
          ruleLevelEnrichments={ruleLevelEnrichments}
          globalEnrichments={globalEnrichments}
          ruleUid={ruleUid}
          onDeleteEnrichment={onDeleteEnrichment}
          showRuleEnrichments={true}
          showGlobalEnrichments={true}
          showSectionHeader={true}
          onEnrichmentCreated={onEnrichmentCreated}
          onEnrichmentUpdated={onEnrichmentUpdated}
          filterLayout="compact"
        />
      </Stack>
    </Box>
  );
};
