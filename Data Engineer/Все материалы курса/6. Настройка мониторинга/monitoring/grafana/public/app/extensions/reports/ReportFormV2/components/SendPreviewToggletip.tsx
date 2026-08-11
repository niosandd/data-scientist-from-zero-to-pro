import { css } from '@emotion/css';
import { useRef, useState, useEffect } from 'react';
import { useForm, useFormContext } from 'react-hook-form';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Button, Field, Input, Stack, Checkbox, useStyles2 } from '@grafana/ui';
import { useSendTestEmailMutation } from 'app/extensions/api/clients/reporting';
import { type ReportFormV2 } from 'app/extensions/types/reports';

import { validateMultipleEmails } from '../../../utils/validators';
import { useReportFormContext } from '../../dashboard-scene/ReportRenderingProvider';
import { selectors } from '../../e2e-selectors/selectors';
import { transformReportV2ToDTO } from '../../utils/serialization';
import { ReportingInteractions } from '../reportingInteractions';
import { type SelectDashboardScene } from '../sections/SelectDashboards/SelectDashboardScene';

interface FormValues {
  previewEmail: string;
  useReportEmails: boolean;
}

export function SendPreviewToggletip({ sceneDashboards }: { sceneDashboards: SelectDashboardScene[] }) {
  const styles = useStyles2(getStyles);
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const { watch: watchMainForm, trigger: triggerMainForm } = useFormContext<ReportFormV2>();
  const recipients = watchMainForm('recipients') || [];
  const reportFormContext = useReportFormContext();

  const [sendTestEmail, { isLoading: isSendingTestEmail }] = useSendTestEmailMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      previewEmail: '',
      useReportEmails: false,
    },
  });

  const useReportEmails = watch('useReportEmails');

  // Measure content height when it changes
  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      if (!isOpen) {
        setContentHeight(0);
      }
      return;
    }

    const height = contentRef.current.scrollHeight;
    setContentHeight(height);
  }, [isOpen, useReportEmails, errors, recipients.length]);

  const handleClose = () => {
    setIsOpen(false);
    reset({
      previewEmail: '',
      useReportEmails: false,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (data: FormValues) => {
    ReportingInteractions.sendClicked(reportFormContext.renderingContext);

    const report = { ...watchMainForm(), recipients: data.useReportEmails ? recipients : [data.previewEmail] };
    const reportDTO = transformReportV2ToDTO({ ...report, dashboardsScene: sceneDashboards });

    await sendTestEmail(reportDTO).unwrap();
    handleClose();
  };

  const onOpenClick = async () => {
    ReportingInteractions.sendPreviewClicked(reportFormContext.renderingContext);
    const isValid = await triggerMainForm(['title', 'dashboards'], {
      shouldFocus: true,
    });

    if (!isValid) {
      return;
    }

    setIsOpen(true);
  };

  return (
    <Stack direction="column" gap={isOpen ? 1 : 0}>
      <div>
        {!isOpen ? (
          <Button
            variant="secondary"
            fill="outline"
            onClick={onOpenClick}
            data-testid={selectors.components.ReportFormDrawer.SendPreview.openButton}
          >
            {t('share-report.send-preview.button', 'Send preview')}
          </Button>
        ) : (
          <Stack gap={1} justifyContent="flex-start" direction={{ xs: 'column', sm: 'row' }}>
            <Button variant="secondary" disabled={isSendingTestEmail} onClick={handleClose}>
              {t('share-report.send-preview.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => handleSubmit(onSubmit)()}
              disabled={isSendingTestEmail}
              icon={isSendingTestEmail ? 'fa fa-spinner' : undefined}
              data-testid={selectors.components.ReportFormDrawer.SendPreview.sendButton}
            >
              {isSendingTestEmail
                ? t('share-report.send-preview.sending', 'Sending...')
                : t('share-report.send-preview.send', 'Send')}
            </Button>
          </Stack>
        )}
      </div>
      <div
        className={styles.animatedContainer}
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div ref={contentRef} className={styles.container}>
          <Stack direction="column" gap={1.5}>
            <Field
              label={t('share-report.send-preview.email', 'Email')}
              required
              description={t(
                'share-report.send-preview.email-description',
                'Separate multiple email addresses with a comma or semicolon'
              )}
              error={errors.previewEmail?.message}
              invalid={!!errors.previewEmail}
            >
              <Input
                // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
                placeholder="your.address@company.com"
                {...register('previewEmail', {
                  required: t('share-report.send-preview.email-required', 'Email is required'),
                  validate: (value) =>
                    validateMultipleEmails(value) ||
                    t('share-report.recipients.invalid-emails', 'Invalid emails: {{emails}}', {
                      emails: value,
                    }),
                })}
                onKeyDown={handleKeyDown}
                disabled={useReportEmails}
              />
            </Field>
            <Field>
              <Checkbox
                disabled={!recipients.length}
                label={t('share-report.send-preview.use-report-emails', 'Use emails from report')}
                data-testid={selectors.components.ReportFormDrawer.SendPreview.useReportEmailsCheckbox}
                {...register('useReportEmails', {
                  onChange: (e) => {
                    const checked = e.target.checked;
                    setValue('useReportEmails', checked);
                    if (checked) {
                      setValue('previewEmail', recipients.join(', '));
                      clearErrors('previewEmail');
                    } else {
                      setValue('previewEmail', '');
                    }
                  },
                })}
              />
            </Field>
          </Stack>
        </div>
      </div>
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    animatedContainer: css({
      overflow: 'hidden',
      margin: 0,
      [theme.transitions.handleMotion('no-preference')]: {
        transition: theme.transitions.create(['max-height', 'opacity'], {
          duration: theme.transitions.duration.standard,
          easing: theme.transitions.easing.easeInOut,
        }),
      },
    }),
    container: css({
      width: '100%',
      padding: `0 ${theme.spacing(1)}`,
    }),
  };
};
