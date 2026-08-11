import { css } from '@emotion/css';
import { useCallback, useState } from 'react';

import { useAssistant, useInlineAssistant } from '@grafana/assistant';
import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import {
  Alert,
  Button,
  Card,
  Field,
  Modal,
  Stack,
  TextArea,
  useStyles2,
  Icon,
  CollapsableSection,
  useTheme2,
  Box,
} from '@grafana/ui';
import { logError } from 'app/features/alerting/unified/Analytics';
import { stringifyErrorLike } from 'app/features/alerting/unified/utils/misc';

import {
  trackAITemplateButtonClick,
  trackAITemplateCancelled,
  trackAITemplateGeneration,
  trackAITemplateUsed,
} from '../analytics/tracking';
import { extractTemplateFromLLMResponse } from '../llmUtils';

import { createSystemPrompt, createUserPrompt } from './prompt';

// Example prompts data structure
const getExamplePrompts = () => [
  {
    category: t('alerting.template-form.genai.examples.basic-alert-info.category', 'Basic Alert Information'),
    examples: [
      t(
        'alerting.template-form.genai.examples.basic-alert-info.example1',
        'Slack notification with alert labels and annotations. Include a direct link to the Grafana dashboard for investigation.'
      ),
      t(
        'alerting.template-form.genai.examples.basic-alert-info.example2',
        'A Slack message that shows "🔥 ALERT: [AlertName] is firing" with a summary and link to view details'
      ),
      t(
        'alerting.template-form.genai.examples.basic-alert-info.example3',
        'Template that produces a message like this:\n🔴 Alert: High CPU Usage\nStatus: Firing 🚨\nInstance: web-server-01\nEnvironment: Production\nTriggered at: 2025-09-16 14:22 UTC\n\n'
      ),
    ],
  },
  {
    category: t(
      'alerting.template-form.genai.examples.firing-resolved.category',
      'Handling Firing vs. Resolved Alerts'
    ),
    examples: [
      t(
        'alerting.template-form.genai.examples.firing-resolved.example1',
        'Write an email body that has a green checkmark emoji for a resolved alert and a red cross for a firing alert.'
      ),
      t(
        'alerting.template-form.genai.examples.firing-resolved.example2',
        'Make a template that lists all firing alerts and all resolved alerts in separate sections.'
      ),
    ],
  },
  {
    category: t('alerting.template-form.genai.examples.multiple-alerts.category', 'Listing Multiple Alerts'),
    examples: [
      t(
        'alerting.template-form.genai.examples.multiple-alerts.example1',
        'Create a custom notification message that lists the summary for each alert in the notification.'
      ),
      t(
        'alerting.template-form.genai.examples.multiple-alerts.example2',
        'Create a Slack message that lists the alert name and the value for each firing alert.'
      ),
    ],
  },
  {
    category: t('alerting.template-form.genai.examples.labels-annotations.category', 'Handling Labels and Annotations'),
    examples: [
      t(
        'alerting.template-form.genai.examples.labels-annotations.example1',
        'Make a template that shows all the labels that are common across all alerts in the notification.'
      ),
      t(
        'alerting.template-form.genai.examples.labels-annotations.example2',
        'Create a message that shows the annotations and their values.'
      ),
    ],
  },
  {
    category: t('alerting.template-form.genai.examples.helper-templates.category', 'Using Helper Templates'),
    examples: [
      t(
        'alerting.template-form.genai.examples.helper-templates.example1',
        "I need a template that gets a severity value from a label called 'severity' and then uses a helper template to show the correct emoji for the severity."
      ),
    ],
  },
  {
    category: t('alerting.template-form.genai.examples.advanced-prompts.category', 'Advanced/Combined Prompts'),
    examples: [
      t(
        'alerting.template-form.genai.examples.advanced-prompts.example1',
        "Create a template for an email body. If there are firing alerts, list each one with its name and a brief description from the annotations. If there are no firing alerts, show a message saying 'No new alerts.'"
      ),
      t(
        'alerting.template-form.genai.examples.advanced-prompts.example2',
        "Generate a custom message for a webhook. The message should have a title that says '[Status] - Alert: Alertname' and then a body that lists all common labels and annotations."
      ),
    ],
  },
];

const ExamplePrompts = ({ onPromptSelect }: { onPromptSelect: (prompt: string) => void }) => {
  const theme = useTheme2();
  const styles = useStyles2(() => getDescriptionStyles(theme));
  const examplePrompts = getExamplePrompts();

  const handleCopyPrompt = (prompt: string) => {
    onPromptSelect(prompt);
  };

  return (
    <Stack direction="column" gap={2}>
      <div className={styles.sectionTitle}>
        <Trans i18nKey="alerting.template-form.genai.modal.examples.title">Example Prompts (click to copy)</Trans>
      </div>

      {examplePrompts.map((category, categoryIndex) => (
        <CollapsableSection key={categoryIndex} label={category.category} isOpen={false}>
          <Stack direction="column" gap={1}>
            {category.examples.map((example, exampleIndex) => (
              <Card key={exampleIndex} className={styles.examplePromptCard} onClick={() => handleCopyPrompt(example)}>
                <Stack direction="row" gap={2} alignItems="flex-start">
                  <Icon name="copy" size="sm" className={styles.copyIcon} />
                  <div className={styles.examplePromptText}>{example}</div>
                </Stack>
              </Card>
            ))}
          </Stack>
        </CollapsableSection>
      ))}
    </Stack>
  );
};

const PromptDescription = () => {
  return (
    <Box direction="column" gap={2} marginTop={2} marginBottom={2}>
      <div style={{ fontSize: '14px', color: 'var(--grafana-colors-text-secondary)', fontStyle: 'italic' }}>
        <Trans i18nKey="alerting.template-form.genai.modal.prompt-description.tip">
          💡 Tip: The more explicit and detailed your prompt is, the better results you&apos;ll get.
        </Trans>
      </div>
    </Box>
  );
};

export interface GenAITemplateButtonProps {
  onTemplateGenerated: (template: string) => void;
  disabled?: boolean;
}

export const GenAITemplateButton = ({ onTemplateGenerated, disabled }: GenAITemplateButtonProps) => {
  const styles = useStyles2(getStyles);

  // Check if assistant is available
  const { isAvailable } = useAssistant();
  const { generate, isGenerating, error: generationError, reset } = useInlineAssistant();

  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleParsedResponse = useCallback(
    (reply: string) => {
      try {
        // Extract template content from the response with robust error handling
        const extractionResult = extractTemplateFromLLMResponse(reply);

        if (extractionResult.success) {
          onTemplateGenerated(extractionResult.content);
          trackAITemplateGeneration({ success: true });
          trackAITemplateUsed();
          setShowModal(false);
        } else {
          logError(new Error('Failed to extract template from LLM response', { cause: extractionResult.error }));
          trackAITemplateGeneration({ success: false, error: stringifyErrorLike(extractionResult.error) });
        }
      } catch (error) {
        logError(new Error('Unexpected error during template extraction', { cause: error }));
        trackAITemplateGeneration({ success: false, error: stringifyErrorLike(error) });
      }
    },
    [onTemplateGenerated]
  );

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      return;
    }

    const systemPrompt = createSystemPrompt();
    const userPrompt = createUserPrompt(prompt);

    generate({
      prompt: userPrompt.content ?? '',
      origin: 'grafana/alerting/template-generator',
      systemPrompt: systemPrompt.content ?? '',
      onComplete: handleParsedResponse,
      onError: (error) => {
        logError(new Error('Failed to generate template with AI', { cause: error }));
        trackAITemplateGeneration({ success: false, error: stringifyErrorLike(error) });
      },
    });
  }, [prompt, generate, handleParsedResponse]);

  const handleClose = () => {
    if (prompt.trim()) {
      trackAITemplateCancelled();
    }

    setShowModal(false);
    setPrompt('');
    reset();
  };

  const handlePromptSelect = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        icon="ai"
        fill="text"
        onClick={() => {
          trackAITemplateButtonClick();
          setShowModal(true);
        }}
        disabled={disabled}
        data-testid="generate-template-button"
      >
        <Trans i18nKey="alerting.templates.editor.generate-with-ai">Generate with AI</Trans>
      </Button>

      <Modal
        title={t('alerting.template-form.genai.modal.title', 'Generate Template with AI')}
        isOpen={showModal}
        onDismiss={handleClose}
        className={styles.modal}
      >
        <Stack direction="column" gap={3}>
          <Field
            label={t(
              'alerting.template-form.genai.modal.prompt-label',
              'Describe how you want your notification to look'
            )}
            description={<PromptDescription />}
            noMargin
          >
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder={t(
                'alerting.template-form.genai.modal.prompt-placeholder',
                'A Slack message that shows "🔥 ALERT: [AlertName] is firing" with a summary and link to view details...'
              )}
              rows={10}
              disabled={isGenerating}
            />
          </Field>

          <ExamplePrompts onPromptSelect={handlePromptSelect} />

          {generationError && (
            <Alert title={t('alerting.template-form.genai.modal.error-title', 'Error')} severity="error">
              <Trans i18nKey="alerting.template-form.genai.modal.error">{stringifyErrorLike(generationError)}</Trans>
            </Alert>
          )}

          <Stack direction="row" justifyContent="flex-end" gap={2}>
            <Button variant="secondary" onClick={handleClose}>
              <Trans i18nKey="common.cancel">Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              icon={isGenerating ? 'spinner' : 'ai'}
            >
              {isGenerating ? (
                <Trans i18nKey="alerting.template-form.genai.modal.generating">Generating...</Trans>
              ) : (
                <Trans i18nKey="alerting.template-form.genai.modal.generate">Generate Template</Trans>
              )}
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
};

const getStyles = () => ({
  modal: css({
    width: '50%',
    maxWidth: 600,
  }),
});

const getDescriptionStyles = (theme: GrafanaTheme2) => ({
  sectionTitle: css({
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightBold,
    color: theme.colors.text.primary,
    marginBottom: '8px',
  }),
  examplePromptCard: css({
    padding: '8px 12px',
    cursor: 'pointer',
    border: `1px solid ${theme.colors.border.weak}`,
    [theme.transitions.handleMotion('no-preference')]: {
      transition: theme.transitions.create(['background-color', 'border-color', 'transform', 'box-shadow'], {
        duration: theme.transitions.duration.short,
      }),
    },
    '&:hover': {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border.strong,
      [theme.transitions.handleMotion('no-preference')]: {
        transform: 'translateY(-1px)',
        boxShadow: theme.shadows.z1,
      },
    },
  }),
  copyIcon: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
    marginTop: '2px',
  }),
  examplePromptText: css({
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: '1.4',
    color: theme.colors.text.primary,
    fontStyle: 'italic',
  }),
});
