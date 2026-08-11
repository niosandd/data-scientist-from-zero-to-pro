import { css } from '@emotion/css';
import { useEffect, useId } from 'react';
import { useFormContext } from 'react-hook-form';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Field, Input, Stack, Switch, useStyles2 } from '@grafana/ui';

import { type AwsKeeperFormValues } from '../../types';
import { validateAwsRegion, validateRoleArn } from '../../validation';
import { KeeperDetailsFields } from '../KeeperDetailsFields';

interface AwsProviderEditContentProps {
  onCanSubmitChange: (canSubmit: boolean) => void;
}

export function AwsProviderEditContent({ onCanSubmitChange }: AwsProviderEditContentProps) {
  const styles = useStyles2(getStyles);
  const {
    register,
    formState: { errors, isValid },
  } = useFormContext<AwsKeeperFormValues>();

  const arnId = useId();
  const regionId = useId();
  const kmsKeyIdInputId = useId();
  const activeId = useId();

  useEffect(() => {
    onCanSubmitChange(isValid);
  }, [isValid, onCanSubmitChange]);

  return (
    <Stack direction="column" gap={2}>
      <p className={styles.requiredNote}>{t('secrets-keeper.form.required-note', '* indicates a required field')}</p>

      <KeeperDetailsFields isNameDisabled />

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

      <Field
        label={t('secrets-keeper.form.active.label', 'Active keeper')}
        description={t(
          'secrets-keeper.form.active.description',
          'When enabled, this keeper stores all new secrets in the namespace. Switching activation off reverts to the system keeper.'
        )}
        htmlFor={activeId}
        noMargin
      >
        <Switch {...register('isActive')} id={activeId} data-testid="edit-active-switch" />
      </Field>
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  requiredNote: css({
    // Browser default `<p>` margin (1em top/bottom) adds visible drift on top
    // of the Stack's gap. Reset and apply controlled spacing.
    margin: 0,
    marginTop: theme.spacing(3),
    // Pull the next field up further so the note reads as a hint, not a
    // block element. Net spacing below = Stack gap (16px) + (-12px) = 4px.
    marginBottom: theme.spacing(-1.5),
    // ~25% smaller than bodySmall to de-emphasize against form labels.
    fontSize: `calc(${theme.typography.bodySmall.fontSize} * 0.75)`,
    // ~20% lighter than text.secondary by stacking opacity on the muted color.
    color: theme.colors.text.secondary,
    opacity: 0.8,
    // Anchor at the right edge of the form so it doesn't compete visually with
    // the field labels on the left.
    textAlign: 'right',
  }),
});
