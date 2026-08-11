import { useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import { Alert, Button, ClipboardButton, CollapsableSection, Stack, TextLink, useStyles2 } from '@grafana/ui';

import { IAM_POLICY_NAME } from '../../constants';
import { type InstructionSectionProps } from '../../types';
import { SectionLabel } from '../SectionLabel';
import { SubsectionComplete } from '../SubsectionComplete';
import { SubsectionHeader } from '../SubsectionHeader';

import { getInstructionStyles } from './awsProviderInstructionStyles';

const SECRETS_MANAGER_POLICY = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'GrafanaManagedSecrets',
        Effect: 'Allow',
        Action: [
          'secretsmanager:CreateSecret',
          'secretsmanager:UpdateSecret',
          'secretsmanager:PutSecretValue',
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:DeleteSecret',
          'secretsmanager:TagResource',
        ],
        Resource: 'arn:aws:secretsmanager:*:*:secret:grafana-secrets-manager/*',
      },
      {
        Sid: 'ListSecretsForValidation',
        Effect: 'Allow',
        Action: ['secretsmanager:ListSecrets'],
        Resource: '*',
      },
      {
        Sid: 'ReadExistingSecrets',
        Effect: 'Allow',
        Action: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
        Resource: '*',
      },
    ],
  },
  null,
  2
);

const KMS_POLICY_STATEMENT = JSON.stringify(
  {
    Sid: 'KMSForSecretsManager',
    Effect: 'Allow',
    Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'],
    Resource: 'arn:aws:kms:REGION:ACCOUNT_ID:key/YOUR-KEY-ID',
    Condition: {
      StringEquals: {
        'kms:ViaService': 'secretsmanager.REGION.amazonaws.com',
      },
    },
  },
  null,
  2
);

const SUBSECTION_IDS = ['navigate', 'permissions', 'complete'] as const;
type SubsectionId = (typeof SUBSECTION_IDS)[number];

export function AwsProviderSection1({ isOpen, onToggle, onContinue }: InstructionSectionProps) {
  const styles = useStyles2(getInstructionStyles);

  const [subsectionChecked, setSubsectionChecked] = useState<Record<SubsectionId, boolean>>({
    navigate: false,
    permissions: false,
    complete: false,
  });
  const [viewPolicyDrawerOpen, setViewPolicyDrawerOpen] = useState(false);
  const [kmsDrawerOpen, setKmsDrawerOpen] = useState(false);

  const isComplete = Object.values(subsectionChecked).every(Boolean);
  const toggle = (id: SubsectionId) => setSubsectionChecked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <CollapsableSection
      className={styles.sectionHeader}
      label={
        <SectionLabel
          isComplete={isComplete}
          title={t('secrets-keeper.instructions.s1.title', '1. Create an IAM policy')}
        />
      }
      isOpen={isOpen}
      onToggle={onToggle}
      contentClassName={styles.sectionContent}
      contentDataTestId="section-1-content"
    >
      <Stack direction="column" gap={1.5}>
        <SubsectionHeader title={t('secrets-keeper.instructions.s1.navigate.title', 'Navigate to IAM Policies')} />
        <ol className={styles.stepList}>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.navigate.step1">
              Open the{' '}
              <TextLink href="https://console.aws.amazon.com/iam/" external>
                AWS IAM Console
              </TextLink>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.navigate.step2">
              In the left navigation, click <strong>Policies</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.navigate.step3">
              Click the <strong>Create policy</strong> button
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.navigate.step4">
              Select the <strong>JSON</strong> tab
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked.navigate} onChange={() => toggle('navigate')} />

        <SubsectionHeader title={t('secrets-keeper.instructions.s1.permissions.title', 'Permissions policy')} />
        <p className={styles.bodyText}>
          {t(
            'secrets-keeper.instructions.s1.permissions.intro',
            'Copy and paste the following policy into the JSON editor in AWS.'
          )}
        </p>

        <CollapsableSection
          label={t('secrets-keeper.instructions.s1.view-policy-json', 'View policy JSON')}
          isOpen={viewPolicyDrawerOpen}
          onToggle={setViewPolicyDrawerOpen}
          contentClassName={styles.nestedContent}
        >
          <div className={styles.codeBlock}>
            <ClipboardButton
              className={styles.copyButton}
              icon="copy"
              variant="secondary"
              size="sm"
              getText={() => SECRETS_MANAGER_POLICY}
            >
              {t('secrets-keeper.instructions.copy', 'Copy')}
            </ClipboardButton>
            <pre className={styles.codeText}>{SECRETS_MANAGER_POLICY}</pre>
          </div>
          <Alert severity="info" title={t('secrets-keeper.instructions.s1.info-title', 'About this policy')}>
            <Trans i18nKey="secrets-keeper.instructions.s1.info-body">
              The first statement allows Grafana to create and manage secrets under the{' '}
              <code>grafana-secrets-manager/*</code> prefix. The second allows listing secrets for validation. The third
              allows reading any existing secret you reference.
            </Trans>
          </Alert>
        </CollapsableSection>

        <CollapsableSection
          label={t('secrets-keeper.instructions.s1.kms-drawer.label', 'Using a custom KMS key?')}
          isOpen={kmsDrawerOpen}
          onToggle={setKmsDrawerOpen}
          contentClassName={styles.nestedContent}
        >
          <p className={styles.bodyText}>
            <Trans i18nKey="secrets-keeper.instructions.s1.kms-drawer.intro">
              If you plan to use a custom KMS key for encryption, add this statement to your policy. Replace{' '}
              <code>REGION</code>, <code>ACCOUNT_ID</code>, and <code>YOUR-KEY-ID</code> with your values.
            </Trans>
          </p>
          <div className={styles.codeBlock}>
            <ClipboardButton
              className={styles.copyButton}
              icon="copy"
              variant="secondary"
              size="sm"
              getText={() => KMS_POLICY_STATEMENT}
            >
              {t('secrets-keeper.instructions.copy', 'Copy')}
            </ClipboardButton>
            <pre className={styles.codeText}>{KMS_POLICY_STATEMENT}</pre>
          </div>
        </CollapsableSection>
        <SubsectionComplete checked={subsectionChecked.permissions} onChange={() => toggle('permissions')} />

        <SubsectionHeader title={t('secrets-keeper.instructions.s1.complete.title', 'Complete policy creation')} />
        <ol className={styles.stepList} start={4}>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.complete.step1">
              Click <strong>Next</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.complete.step2" values={{ IAM_POLICY_NAME }}>
              Enter the policy name: <code>{IAM_POLICY_NAME}</code>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s1.complete.step3">
              Click <strong>Create policy</strong>
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked.complete} onChange={() => toggle('complete')} />

        <Stack justifyContent="flex-end">
          <Button variant="secondary" onClick={onContinue} data-testid="section-1-continue">
            {t('secrets-keeper.instructions.continue', 'Continue')}
          </Button>
        </Stack>
      </Stack>
    </CollapsableSection>
  );
}
