import { Controller, useFormContext } from 'react-hook-form';

import { type SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Field, FieldSet, Input, RadioButtonGroup, Stack, Switch, Text } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { ThemePicker } from 'app/features/dashboard/components/ShareModal/ThemePicker';

import { ResourcePicker } from '../shared/ResourcePicker';
import { getResourceUrl } from '../shared/utils/data';
import { AccessControlAction, FooterMode } from '../types';

import { FooterItemsEditor } from './FooterItemsEditor';
import { ImagePreview } from './ImagePreview';
import { defaultEmailLogo, defaultReportLogo } from './constants';

interface SwitchFieldProps {
  name: string;
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
}

const SwitchField = ({ name, id, label, description, disabled }: SwitchFieldProps) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, value, ...field } }) => (
        <Field htmlFor={id} label={label} description={description}>
          <Switch {...field} id={id} value={value} disabled={disabled} />
        </Field>
      )}
    />
  );
};

const ReportBranding = () => {
  const { register, control, watch } = useFormContext();

  const watchReportLogo = watch('branding.reportLogoUrl') || defaultReportLogo;
  const watchEmailLogo = watch('branding.emailLogoUrl') || defaultEmailLogo;
  const watchFooterMode = watch('branding.emailFooterMode');
  const canEditSettings = contextSrv.hasPermission(AccessControlAction.ReportingSettingsWrite);

  const footerModeOptions: SelectableValue[] = [
    { label: t('reporting.settings.sent-by-footer-label', 'Sent By'), value: FooterMode.SentBy },
    { label: t('reporting.settings.none-footer-label', 'None'), value: FooterMode.None },
  ];

  const isReportingHeaderSettingsEnabled = config.featureToggles.reportingHeaderSettings;
  const isReportingFooterSettingsEnabled = config.featureToggles.reportingFooterSettings;

  return (
    <>
      <FieldSet
        label={t('reporting.settings.attachment-settings-fieldset-label', 'Attachment settings')}
        disabled={!canEditSettings}
      >
        <Stack direction="column" gap={2}>
          <Text element={'h4'}>
            <Trans i18nKey="reporting.settings.pdf-header">PDF</Trans>
          </Text>
          <Stack direction="column" gap={1}>
            <Field
              htmlFor={'branding.reportLogoUrl'}
              label={t('reporting.settings.report-logo-url-field-label', 'Company logo URL')}
              description={t(
                'reporting.settings.report-logo-url-field-description',
                'The logo will be displayed in the document footer. Supported formats: png, jpg, gif.'
              )}
            >
              <ResourcePicker name={'branding.reportLogoUrl'} />
            </Field>
            <ImagePreview
              url={watchReportLogo === defaultReportLogo ? defaultReportLogo : getResourceUrl(watchReportLogo)}
              width="60px"
              altText={t('reporting.settings.report-logo-image-preview-altText', 'Company logo preview')}
            />
            <Controller
              render={({ field }) => (
                <ThemePicker
                  description={t(
                    'reporting.settings.pdf-theme-picker-description',
                    'The theme will be applied to the PDF attached to the report.'
                  )}
                  selectedTheme={field.value}
                  onChange={field.onChange}
                />
              )}
              control={control}
              name="pdfTheme"
            />
            {isReportingHeaderSettingsEnabled && (
              <>
                <SwitchField
                  name="pdfHeaderEnabled"
                  id="pdfHeaderEnabled"
                  label={t('reporting.settings.pdf-header-enabled-label', 'Show header')}
                  description={t(
                    'reporting.settings.pdf-header-enabled-description',
                    'Display the report title and generated date in the PDF header.'
                  )}
                  disabled={!canEditSettings}
                />
                <SwitchField
                  name="pdfDashboardTitleEnabled"
                  id="pdfDashboardTitleEnabled"
                  label={t('reporting.settings.pdf-dashboard-title-enabled-label', 'Show dashboard title')}
                  description={t(
                    'reporting.settings.pdf-dashboard-title-enabled-description',
                    'Display the dashboard title in the PDF header.'
                  )}
                  disabled={!canEditSettings}
                />
                <SwitchField
                  name="pdfTimeRangeEnabled"
                  id="pdfTimeRangeEnabled"
                  label={t('reporting.settings.pdf-time-range-enabled-label', 'Show data time range')}
                  description={t(
                    'reporting.settings.pdf-time-range-enabled-description',
                    'Display the data time range in the PDF header.'
                  )}
                  disabled={!canEditSettings}
                />
              </>
            )}
            {isReportingFooterSettingsEnabled && <FooterItemsEditor />}
          </Stack>
          <Text element={'h4'}>
            <Trans i18nKey="reporting.settings.embedded-image-header">Embedded image</Trans>
          </Text>
          <Stack direction="column" gap={1}>
            <Controller
              render={({ field }) => (
                <ThemePicker
                  description={t(
                    'reporting.settings.embedded-image-theme-picker-description',
                    'The theme will be applied to the dashboard image embedded in the email.'
                  )}
                  selectedTheme={field.value}
                  onChange={field.onChange}
                />
              )}
              control={control}
              name="embeddedImageTheme"
            />
          </Stack>
        </Stack>
      </FieldSet>

      <FieldSet
        label={t('reporting.settings.email-branding-fieldset-label', 'Email branding')}
        disabled={!canEditSettings}
      >
        <Field
          htmlFor={'emailLogoUrl'}
          label={t('reporting.settings.email-logo-url-field-label', 'Company logo URL')}
          description={t(
            'reporting.settings.email-logo-url-field-description',
            'The logo will be displayed in the email header. Supported formats: png, jpg, gif.'
          )}
        >
          <ResourcePicker name={'branding.emailLogoUrl'} />
        </Field>
        <ImagePreview
          url={watchEmailLogo === defaultEmailLogo ? defaultEmailLogo : getResourceUrl(watchEmailLogo)}
          altText={t('reporting.settings.email-logo-image-preview-altText', 'Company logo preview')}
        />
        <Field label={t('reporting.settings.email-footer-field-label', 'Email footer')}>
          <Controller
            name="branding.emailFooterMode"
            render={({ field: { ref, ...field } }) => <RadioButtonGroup {...field} options={footerModeOptions} />}
            control={control}
          />
        </Field>
        {watchFooterMode === FooterMode.SentBy && (
          <>
            <Field label={t('reporting.settings.footer-link-field-label', 'Footer link text')}>
              {/* eslint-disable-next-line @grafana/i18n/no-untranslated-strings */}
              <Input {...register('branding.emailFooterText')} id="emailFooterText" placeholder="Grafana" type="text" />
            </Field>
            <Field label={t('reporting.settings.footer-link-url-field-label', 'Footer link URL')}>
              <Input
                {...register('branding.emailFooterLink')}
                id="emailFooterLink"
                // eslint-disable-next-line @grafana/i18n/no-untranslated-strings
                placeholder="https://your.site"
                type="url"
              />
            </Field>
          </>
        )}
      </FieldSet>
    </>
  );
};

export default ReportBranding;
