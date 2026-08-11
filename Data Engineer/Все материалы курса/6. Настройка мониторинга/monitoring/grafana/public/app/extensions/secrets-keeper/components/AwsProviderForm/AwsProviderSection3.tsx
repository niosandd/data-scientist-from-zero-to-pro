import { useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import { Alert, Button, ClipboardButton, CollapsableSection, Stack, TextLink, useStyles2 } from '@grafana/ui';

import { GRAFANA_ACCOUNT_ID, GRAFANA_EXTERNAL_ID, IAM_ROLE_NAME } from '../../constants';
import { type InstructionSectionProps } from '../../types';
import { SectionLabel } from '../SectionLabel';
import { SubsectionComplete } from '../SubsectionComplete';
import { SubsectionHeader } from '../SubsectionHeader';

import { getInstructionStyles } from './awsProviderInstructionStyles';

const TRUST_POLICY = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          AWS: `arn:aws:iam::${GRAFANA_ACCOUNT_ID}:user/grafana-secrets-manager`,
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'sts:ExternalId': GRAFANA_EXTERNAL_ID,
          },
        },
      },
    ],
  },
  null,
  2
);

const SUBSECTION_IDS = ['navigate', 'verify', 'copy-arn'] as const;
type SubsectionId = (typeof SUBSECTION_IDS)[number];

export function AwsProviderSection3({ isOpen, onToggle, onContinue }: InstructionSectionProps) {
  const styles = useStyles2(getInstructionStyles);

  const [subsectionChecked, setSubsectionChecked] = useState<Record<SubsectionId, boolean>>({
    navigate: false,
    verify: false,
    'copy-arn': false,
  });
  const [viewTrustPolicyJsonOpen, setViewTrustPolicyJsonOpen] = useState(false);

  const isComplete = Object.values(subsectionChecked).every(Boolean);
  const toggle = (id: SubsectionId) => setSubsectionChecked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <CollapsableSection
      className={styles.sectionHeader}
      label={
        <SectionLabel
          isComplete={isComplete}
          title={t('secrets-keeper.instructions.s3.title', '3. Verify trust policy')}
        />
      }
      isOpen={isOpen}
      onToggle={onToggle}
      contentClassName={styles.sectionContent}
      contentDataTestId="section-3-content"
    >
      <Stack direction="column" gap={1.5}>
        <p className={styles.bodyText}>
          {t(
            'secrets-keeper.instructions.s3.intro',
            'AWS creates a trust policy automatically when you follow the steps in section 2. Use this section to verify or manually update it if needed.'
          )}
        </p>

        <SubsectionHeader title={t('secrets-keeper.instructions.s3.navigate.title', 'Navigate to the trust policy')} />
        <ol className={styles.stepList}>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s3.navigate.step1">
              In the{' '}
              <TextLink href="https://console.aws.amazon.com/iam/" external>
                AWS IAM Console
              </TextLink>
              , go to <strong>Roles</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s3.navigate.step2" values={{ IAM_ROLE_NAME }}>
              Find and click on the role you created: <code>{IAM_ROLE_NAME}</code>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s3.navigate.step3">
              Select the <strong>Trust relationships</strong> tab
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s3.navigate.step4">
              Click <strong>Edit trust policy</strong>
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked.navigate} onChange={() => toggle('navigate')} />

        <SubsectionHeader title={t('secrets-keeper.instructions.s3.verify.title', 'Trust policy reference')} />
        <p className={styles.bodyText}>
          {t(
            'secrets-keeper.instructions.s3.verify.intro',
            "Your role's trust policy should match the following. If it doesn't, copy and paste this policy into the editor."
          )}
        </p>

        <CollapsableSection
          label={t('secrets-keeper.instructions.s3.view-trust-policy', 'View trust policy JSON')}
          isOpen={viewTrustPolicyJsonOpen}
          onToggle={setViewTrustPolicyJsonOpen}
          contentClassName={styles.nestedContent}
        >
          <div className={styles.codeBlock}>
            <ClipboardButton
              className={styles.copyButton}
              icon="copy"
              variant="secondary"
              size="sm"
              getText={() => TRUST_POLICY}
            >
              {t('secrets-keeper.instructions.copy', 'Copy')}
            </ClipboardButton>
            <pre className={styles.codeText}>{TRUST_POLICY}</pre>
          </div>
          <Alert severity="info" title={t('secrets-keeper.instructions.s3.info-title', 'About the trust policy')}>
            <Trans i18nKey="secrets-keeper.instructions.s3.info-body" values={{ GRAFANA_EXTERNAL_ID }}>
              The trust policy allows Grafana to assume this role on your behalf, but only when the correct External ID
              is provided. This prevents unauthorized access. If you chose your own External ID in section 2 instead of
              the suggested value, replace <code>{GRAFANA_EXTERNAL_ID}</code> in the trust policy JSON above with the
              value you used.
            </Trans>
          </Alert>
        </CollapsableSection>
        <SubsectionComplete checked={subsectionChecked.verify} onChange={() => toggle('verify')} />

        <SubsectionHeader title={t('secrets-keeper.instructions.s3.arn.title', 'Copy your Role ARN')} />
        <ol className={styles.stepList} start={5}>
          <li>{t('secrets-keeper.instructions.s3.arn.step1', "Return to the role's Summary page")}</li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s3.arn.step2">
              Copy the <strong>Role ARN</strong> — you will enter it in the <strong>Configure Keeper</strong> section
              below
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked['copy-arn']} onChange={() => toggle('copy-arn')} />

        <Stack justifyContent="flex-end">
          <Button variant="secondary" onClick={onContinue} data-testid="section-3-continue">
            {t('secrets-keeper.instructions.continue', 'Continue')}
          </Button>
        </Stack>
      </Stack>
    </CollapsableSection>
  );
}
