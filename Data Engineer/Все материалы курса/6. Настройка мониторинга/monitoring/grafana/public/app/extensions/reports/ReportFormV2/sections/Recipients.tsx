import { Controller, useFormContext } from 'react-hook-form';

import { t } from '@grafana/i18n';
import { Field } from '@grafana/ui';
import { type ReportFormV2 } from 'app/extensions/types/reports';
import { emailSeparator, isEmail } from 'app/extensions/utils/validators';

import { selectors } from '../../e2e-selectors/selectors';
import { canEditReport } from '../../utils/permissions';
import { formSchemaValidationRules } from '../../utils/validation';
import ReportSection from '../ReportSection';
import { ReportRecipientInput } from '../components/ReportRecipientInput';

import { type SectionProps } from './types';

export default function Recipients({ open, onToggle }: SectionProps) {
  const {
    control,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
  } = useFormContext<ReportFormV2>();

  function handleRecipientsChange(recipients: string[]) {
    // First, split any recipients that contain separators (semicolons or commas)
    const splitRecipients = recipients.flatMap((recipient) =>
      recipient
        .split(emailSeparator)
        .filter(Boolean)
        .map((email) => email.trim())
    );

    // Remove duplicates using Set
    const uniqueRecipients = [...new Set(splitRecipients)];

    const validEmails = uniqueRecipients.filter((recipient) => isEmail(recipient));
    const invalidEmails = uniqueRecipients.filter((recipient) => !isEmail(recipient));

    // Update form value with array of valid emails
    setValue('recipients', validEmails, {
      shouldDirty: true,
    });

    if (invalidEmails.length) {
      setError('recipients', {
        type: 'manual',
        message:
          invalidEmails.length > 1
            ? t('share-report.recipients.invalid-emails', 'Invalid emails: {{emails}}', {
                emails: invalidEmails.join('; '),
              })
            : t('share-report.recipients.invalid-email', 'Invalid email: {{email}}', {
                email: invalidEmails[0],
              }),
      });
    } else {
      clearErrors('recipients');
    }
  }

  return (
    <ReportSection
      isOpen={open}
      label={t('share-report.recipients.section-title', 'Recipients')}
      onToggle={onToggle}
      dataTestId={selectors.components.ReportFormDrawer.Recipients.header}
      contentDataTestId={selectors.components.ReportFormDrawer.Recipients.content}
    >
      <Field
        label={t('share-report.recipients.field-label', 'Recipients')}
        description={t(
          'share-report.recipients.tooltip',
          'Separate multiple email addresses with a comma or semicolon'
        )}
        required
        invalid={!!errors.recipients}
        error={errors.recipients?.message}
      >
        <Controller
          name="recipients"
          control={control}
          rules={formSchemaValidationRules().recipients}
          render={({ field: { value, ...rest } }) => (
            <ReportRecipientInput
              {...rest}
              disabled={!canEditReport}
              invalid={!!errors.recipients}
              onChange={handleRecipientsChange}
              placeholder={t(
                'share-report.recipients.placeholder',
                "Type in the recipients' email addresses and press Enter"
              )}
              recipients={value}
              addOnBlur
            />
          )}
        />
      </Field>
    </ReportSection>
  );
}
