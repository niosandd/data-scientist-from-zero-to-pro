import { type ComponentType } from 'react';

import { Text } from '@grafana/ui';
import { type RuleViewerExtensionProps } from 'app/features/alerting/unified/components/rule-viewer/tabs/extensions/RuleViewerExtension';

import { DEFAULT_ENRICHMENTS_LIMIT } from '../constants';
import { useFilteredEnrichments } from '../helpers/useEnrichments';
import { EnrichmentUnifiedView } from '../ruleListExtensions/EnrichmentUnifiedView';

export interface RulePageEnrichmentSectionProps extends RuleViewerExtensionProps {
  ruleUid: string;
}

export const RulePageEnrichmentSection: ComponentType<RulePageEnrichmentSectionProps> = ({ ruleUid }) => {
  const { ruleLevelEnrichments, globalEnrichments, refetch } = useFilteredEnrichments(
    DEFAULT_ENRICHMENTS_LIMIT,
    ruleUid
  );

  return (
    <Text>
      <EnrichmentUnifiedView
        ruleLevelEnrichments={ruleLevelEnrichments}
        globalEnrichments={globalEnrichments}
        ruleUid={ruleUid}
        onDeleteEnrichment={(_id) => {
          void refetch();
        }}
        onEnrichmentCreated={refetch}
        onEnrichmentUpdated={refetch}
      />
    </Text>
  );
};
