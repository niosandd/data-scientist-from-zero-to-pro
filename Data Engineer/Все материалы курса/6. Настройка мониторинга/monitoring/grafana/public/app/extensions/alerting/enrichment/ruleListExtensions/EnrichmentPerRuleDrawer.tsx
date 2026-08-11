// This component is used to render the enrichment per rule drawer.

import { type ComponentType } from 'react';

import { DEFAULT_ENRICHMENTS_LIMIT } from '../constants';
import { useFilteredEnrichments } from '../helpers/useEnrichments';

import { EnrichmentManageDrawer } from './EnrichmentManageDrawer';

export interface EnrichmentPerRuleDrawerProps {
  ruleUid: string;
  onClose: () => void;
}

export const EnrichmentPerRuleDrawer: ComponentType<EnrichmentPerRuleDrawerProps> = ({ ruleUid, onClose }) => {
  const { ruleLevelEnrichments, globalEnrichments } = useFilteredEnrichments(DEFAULT_ENRICHMENTS_LIMIT, ruleUid);

  return (
    <EnrichmentManageDrawer
      onClose={onClose}
      ruleLevelEnrichments={ruleLevelEnrichments}
      globalEnrichments={globalEnrichments}
      ruleUid={ruleUid}
    />
  );
};
