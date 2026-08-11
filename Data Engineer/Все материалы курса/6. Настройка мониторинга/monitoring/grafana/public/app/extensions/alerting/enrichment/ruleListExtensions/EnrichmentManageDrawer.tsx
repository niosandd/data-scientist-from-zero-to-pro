import { type ComponentType, useState } from 'react';

import { t } from '@grafana/i18n';
import { Stack, Box, Drawer, TabsBar, Tab } from '@grafana/ui';
import { type AlertEnrichment } from 'app/extensions/api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnrichmentContent } from './EnrichmentContent';

export interface EnrichmentManageDrawerProps {
  onClose: () => void;
  ruleLevelEnrichments: AlertEnrichment[];
  globalEnrichments: AlertEnrichment[];
  ruleUid: string;
}

export const EnrichmentManageDrawer: ComponentType<EnrichmentManageDrawerProps> = ({
  onClose,
  ruleLevelEnrichments,
  globalEnrichments,
  ruleUid,
}) => {
  const [activeTab, setActiveTab] = useState<'rule' | 'global'>('rule');

  return (
    <Drawer title={t('alerting.enrichment.drawer.title', 'Alert enrichment')} size="lg" onClose={onClose}>
      <Box padding={2}>
        <Stack direction="column" gap={3}>
          {/* Tab Navigation */}
          <TabsBar>
            <Tab
              label={t('alerting.enrichment.drawer.rule-enrichments', 'Rule enrichments')}
              active={activeTab === 'rule'}
              onChangeTab={() => setActiveTab('rule')}
            />
            <Tab
              label={t('alerting.enrichment.drawer.global-enrichments', 'Global enrichments')}
              active={activeTab === 'global'}
              onChangeTab={() => setActiveTab('global')}
              counter={globalEnrichments.length > 0 ? globalEnrichments.length : undefined}
            />
          </TabsBar>

          {/* Content using the reusable component */}
          <EnrichmentContent
            ruleLevelEnrichments={ruleLevelEnrichments}
            globalEnrichments={globalEnrichments}
            ruleUid={ruleUid}
            showRuleEnrichments={activeTab === 'rule'}
            showGlobalEnrichments={activeTab === 'global'}
            showSectionHeader={false}
          />
        </Stack>
      </Box>
    </Drawer>
  );
};
