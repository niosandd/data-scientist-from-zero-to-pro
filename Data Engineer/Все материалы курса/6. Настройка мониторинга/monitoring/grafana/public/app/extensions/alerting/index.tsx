import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { SafeDynamicImport } from 'app/core/components/DynamicImports/SafeDynamicImport';
import { type RouteDescriptor } from 'app/core/navigation/types';
import { addEnrichmentDrawerExtension } from 'app/features/alerting/unified/components/rule-list/extensions/EnrichmentDrawerExtension';
import { addRulePageEnrichmentSection } from 'app/features/alerting/unified/components/rule-viewer/tabs/extensions/RuleViewerExtension';
import { addAIAlertRuleButton } from 'app/features/alerting/unified/enterprise-components/AI/AIGenAlertRuleButton/addAIAlertRuleButton';
import { addAIImproveAnnotationsButton } from 'app/features/alerting/unified/enterprise-components/AI/AIGenImproveAnnotationsButton/addAIImproveAnnotationsButton';
import { addAIImproveLabelsButton } from 'app/features/alerting/unified/enterprise-components/AI/AIGenImproveLabelsButton/addAIImproveLabelsButton';
import { addAITemplateButton } from 'app/features/alerting/unified/enterprise-components/AI/AIGenTemplateButton/addAITemplateButton';
import { addAITriageButton } from 'app/features/alerting/unified/enterprise-components/AI/AIGenTriageButton/addAITriageButton';
import { addAIFeedbackButton } from 'app/features/alerting/unified/enterprise-components/AI/addAIFeedbackButton';
import { addEnrichmentSection } from 'app/features/alerting/unified/enterprise-components/rule-view-page/extensions';
import { addSettingsSection } from 'app/features/alerting/unified/settings/extensions';

import { GenAIAlertRuleButton } from './AI/AIGenImproveAlertRule/GenAIAlertRuleButton';
import { GenAIImproveAnnotationsButton } from './AI/AIGenImproveAlertRule/GenAIImproveAnnotationsButton';
import { GenAIImproveLabelsButton } from './AI/AIGenImproveAlertRule/GenAIImproveLabelsButton';
import { GenAITemplateButton } from './AI/AIGenTemplates/GenAITemplateButton';
import { GenAITriageButton } from './AI/AIGenTriageHistory/GenAITriageButton';
import { AIFeedbackComponent } from './AI/feedback/AIFeedbackComponent';
import { EnrichmentPerRuleDrawer } from './enrichment/ruleListExtensions/EnrichmentPerRuleDrawer';
import { RulePageEnrichmentSection } from './enrichment/ruleViewPageExtensions/EnrichmentTab';

export function initAlerting() {
  if (!config.unifiedAlertingEnabled) {
    return;
  }
  // TODO: Add permission check

  if (config.featureToggles.alertEnrichment) {
    addAlertEnrichment();
    if (config.featureToggles.alertingEnrichmentPerRule) {
      addEnrichmentDrawerExtension(EnrichmentPerRuleDrawer);
      addRulePageEnrichmentSection(RulePageEnrichmentSection);
      addEnrichmentSection();
    }
  }

  if (config.featureToggles.alertingAIGenTemplates) {
    addAITemplateButton(GenAITemplateButton);
  }

  if (config.featureToggles.alertingAIAnalyzeCentralStateHistory) {
    addAITriageButton(GenAITriageButton);
  }

  if (config.featureToggles.alertingAIImproveAlertRules) {
    addAIImproveLabelsButton(GenAIImproveLabelsButton);
  }

  if (config.featureToggles.alertingAIImproveAlertRules) {
    addAIImproveAnnotationsButton(GenAIImproveAnnotationsButton);
  }

  if (config.featureToggles.alertingAIGenAlertRules) {
    addAIAlertRuleButton(GenAIAlertRuleButton);
  }

  if (config.featureToggles.alertingAIFeedback) {
    addAIFeedbackButton(AIFeedbackComponent);
  }
}

export function getAlertingEnterpriseRoutes(): RouteDescriptor[] {
  return [
    {
      roles: () => ['Admin'],
      path: '/alerting/admin/enrichment',
      component: SafeDynamicImport(() => import('./enrichment/EnrichmentListLoader')),
    },
    {
      roles: () => ['Admin'],
      path: '/alerting/admin/enrichment/new',
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "NewEnrichment" */ 'app/extensions/alerting/enrichment/NewEnrichment')
      ),
    },
    {
      roles: () => ['Admin'],
      path: '/alerting/admin/enrichment/:enrichmentK8sName',
      component: SafeDynamicImport(
        () => import(/* webpackChunkName: "EditEnrichment" */ 'app/extensions/alerting/enrichment/EditEnrichment')
      ),
    },
  ];
}

function addAlertEnrichment() {
  addSettingsSection({
    text: t('alerting.settings.tabs.enrichment.title', 'Alert Enrichment'),
    id: 'enrichment',
    url: '/alerting/admin/enrichment',
  });
}
