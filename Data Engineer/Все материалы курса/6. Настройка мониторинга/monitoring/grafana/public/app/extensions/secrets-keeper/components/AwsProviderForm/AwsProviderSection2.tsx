import { useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import { Button, ClipboardButton, CollapsableSection, Stack, TextLink, useStyles2 } from '@grafana/ui';

import { GRAFANA_ACCOUNT_ID, GRAFANA_EXTERNAL_ID, IAM_POLICY_NAME, IAM_ROLE_NAME } from '../../constants';
import { type InstructionSectionProps } from '../../types';
import { SectionLabel } from '../SectionLabel';
import { SubsectionComplete } from '../SubsectionComplete';
import { SubsectionHeader } from '../SubsectionHeader';

import { getInstructionStyles } from './awsProviderInstructionStyles';

const SUBSECTION_IDS = ['create-role', 'attach'] as const;
type SubsectionId = (typeof SUBSECTION_IDS)[number];

export function AwsProviderSection2({ isOpen, onToggle, onContinue }: InstructionSectionProps) {
  const styles = useStyles2(getInstructionStyles);

  const [subsectionChecked, setSubsectionChecked] = useState<Record<SubsectionId, boolean>>({
    'create-role': false,
    attach: false,
  });

  const isComplete = Object.values(subsectionChecked).every(Boolean);
  const toggle = (id: SubsectionId) => setSubsectionChecked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <CollapsableSection
      className={styles.sectionHeader}
      label={
        <SectionLabel
          isComplete={isComplete}
          title={t('secrets-keeper.instructions.s2.title', '2. Create an IAM role')}
        />
      }
      isOpen={isOpen}
      onToggle={onToggle}
      contentClassName={styles.sectionContent}
      contentDataTestId="section-2-content"
    >
      <Stack direction="column" gap={1.5}>
        <p className={styles.bodyText}>
          {t(
            'secrets-keeper.instructions.s2.intro',
            'Create an IAM role that allows Grafana to securely access your AWS account.'
          )}
        </p>

        <SubsectionHeader title={t('secrets-keeper.instructions.s2.create.title', 'Create the role')} />
        <ol className={styles.stepList}>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step1">
              Go to the{' '}
              <TextLink href="https://console.aws.amazon.com/iam/" external>
                AWS IAM Console
              </TextLink>{' '}
              and navigate to <strong>Roles</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step2">
              Click <strong>Create role</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step3">
              For &ldquo;Trusted entity type&rdquo;, select <strong>AWS account</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step4">
              Select <strong>Another AWS account</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step5" values={{ GRAFANA_ACCOUNT_ID }}>
              Enter Account ID: <code>{GRAFANA_ACCOUNT_ID}</code>{' '}
              <ClipboardButton
                className={styles.inlineCopyButton}
                icon="copy"
                variant="secondary"
                size="sm"
                getText={() => GRAFANA_ACCOUNT_ID}
                tooltip={t('secrets-keeper.instructions.copy', 'Copy')}
              />
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step6" values={{ GRAFANA_EXTERNAL_ID }}>
              Check <strong>Require external ID</strong> and enter <code>{GRAFANA_EXTERNAL_ID}</code>{' '}
              <ClipboardButton
                className={styles.inlineCopyButton}
                icon="copy"
                variant="secondary"
                size="sm"
                getText={() => GRAFANA_EXTERNAL_ID}
                tooltip={t('secrets-keeper.instructions.copy', 'Copy')}
              />{' '}
              or any value of your choice. Use the same value in section 4. Configure Keeper.
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.create.step7">
              Click <strong>Next</strong> to add permissions
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked['create-role']} onChange={() => toggle('create-role')} />

        <SubsectionHeader
          title={t('secrets-keeper.instructions.s2.attach.title', 'Attach the policy and complete role creation')}
        />
        <ol className={styles.stepList} start={8}>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.attach.step1">
              Click the refresh button to see newly created policies
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.attach.step2" values={{ IAM_POLICY_NAME }}>
              Search for and select <code>{IAM_POLICY_NAME}</code>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.attach.step3">
              Click <strong>Next</strong>
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.attach.step4" values={{ IAM_ROLE_NAME }}>
              Enter the role name: <code>{IAM_ROLE_NAME}</code>. Grafana&apos;s AWS account is configured to only assume
              a role with this exact name.
            </Trans>
          </li>
          <li>
            <Trans i18nKey="secrets-keeper.instructions.s2.attach.step5">
              Click <strong>Create role</strong>
            </Trans>
          </li>
        </ol>
        <SubsectionComplete checked={subsectionChecked.attach} onChange={() => toggle('attach')} />

        <Stack justifyContent="flex-end">
          <Button variant="secondary" onClick={onContinue} data-testid="section-2-continue">
            {t('secrets-keeper.instructions.continue', 'Continue')}
          </Button>
        </Stack>
      </Stack>
    </CollapsableSection>
  );
}
