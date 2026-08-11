import { useId } from 'react';
import { useFormContext } from 'react-hook-form';

import { t } from '@grafana/i18n';
import { CollapsableSection, Field, Input, Stack, useStyles2 } from '@grafana/ui';

import { type AwsKeeperFormValues, type InstructionSectionProps } from '../../types';
import { validateAwsRegion, validateRoleArn } from '../../validation';
import { KeeperDetailsFields } from '../KeeperDetailsFields';
import { SectionLabel } from '../SectionLabel';

import { getInstructionStyles } from './awsProviderInstructionStyles';

type AwsProviderSection4Props = Omit<InstructionSectionProps, 'onContinue'>;

export function AwsProviderSection4({ isOpen, onToggle }: AwsProviderSection4Props) {
  const styles = useStyles2(getInstructionStyles);
  const {
    register,
    formState: { errors, isValid },
  } = useFormContext<AwsKeeperFormValues>();

  const arnId = useId();
  const regionId = useId();
  const kmsKeyIdInputId = useId();

  return (
    <CollapsableSection
      className={styles.sectionHeader}
      label={
        <SectionLabel isComplete={isValid} title={t('secrets-keeper.instructions.s4.title', '4. Configure Keeper')} />
      }
      isOpen={isOpen}
      onToggle={onToggle}
      contentClassName={styles.sectionContent}
      contentDataTestId="section-4-content"
    >
      <Stack direction="column" gap={2}>
        <p className={styles.requiredNote}>{t('secrets-keeper.form.required-note', '* indicates a required field')}</p>

        <KeeperDetailsFields />

        <Field
          label={t('secrets-keeper.form.aws-arn.label', 'Role ARN')}
          description={t('secrets-keeper.form.aws-arn.description', 'IAM role ARN to assume for access')}
          invalid={!!errors.awsAssumeRoleArn}
          error={errors.awsAssumeRoleArn?.message}
          required
          htmlFor={arnId}
          noMargin
        >
          <Input
            {...register('awsAssumeRoleArn', { validate: validateRoleArn })}
            id={arnId}
            aria-required="true"
            aria-invalid={!!errors.awsAssumeRoleArn}
            data-testid="aws-arn-input"
          />
        </Field>

        <Field
          label={t('secrets-keeper.form.aws-region.label', 'Region')}
          description={t('secrets-keeper.form.aws-region.description', 'AWS region (e.g., us-east-1)')}
          invalid={!!errors.awsRegion}
          error={errors.awsRegion?.message}
          required
          htmlFor={regionId}
          noMargin
        >
          <Input
            {...register('awsRegion', { validate: validateAwsRegion })}
            id={regionId}
            aria-required="true"
            aria-invalid={!!errors.awsRegion}
            data-testid="aws-region-input"
          />
        </Field>

        <Field
          label={t('secrets-keeper.form.aws-kms-key-id.label', 'KMS Key ID')}
          description={t(
            'secrets-keeper.form.aws-kms-key-id.description',
            'Custom KMS key ID for encryption. Leave blank to use the AWS-managed key.'
          )}
          htmlFor={kmsKeyIdInputId}
          noMargin
        >
          <Input {...register('awsKmsKeyId')} id={kmsKeyIdInputId} data-testid="aws-kms-key-id-input" />
        </Field>
      </Stack>
    </CollapsableSection>
  );
}
