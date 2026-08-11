import { useCallback } from 'react';

import { createAssistantContextItem, useAssistant } from '@grafana/assistant';
import { type TimeRange } from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { Button } from '@grafana/ui';
import { type LogRecord } from 'app/features/alerting/unified/components/rules/state-history/common';

import { trackAITriageButtonClick } from '../analytics/tracking';

import { createSystemPrompt, createUserPrompt } from './prompt';

export interface GenAITriageButtonProps {
  logRecords: LogRecord[];
  timeRange: TimeRange;
}

export const GenAITriageButton = ({ logRecords, timeRange }: GenAITriageButtonProps) => {
  const { isAvailable: isAssistantAvailable, openAssistant } = useAssistant();

  const logRecordsLength = logRecords.length;
  // Handle opening the assistant
  const handleOpenAssistant = useCallback(() => {
    const systemPrompt = createSystemPrompt();
    const userPrompt = createUserPrompt(logRecords, timeRange);
    if (isAssistantAvailable && openAssistant) {
      trackAITriageButtonClick('assistant');
      openAssistant({
        prompt: systemPrompt.content,
        origin: 'alerting/central-alert-history',
        context: [
          createAssistantContextItem('structured', {
            title: 'Alert History',
            data: {
              data: userPrompt,
            },
          }),
        ],
      });
      return;
    }
  }, [isAssistantAvailable, openAssistant, logRecords, timeRange]);

  if (!isAssistantAvailable) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        icon="ai"
        fill="text"
        onClick={handleOpenAssistant}
        data-testid="triage-ai-button"
        disabled={logRecordsLength === 0}
      >
        <Trans i18nKey="alerting.triage-ai.button">Analyze with Assistant</Trans>
      </Button>
    </>
  );
};
