import { useForm, FormProvider } from 'react-hook-form';
import tinycolor from 'tinycolor2';

import { Trans, t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Button, Alert, Drawer, LoadingPlaceholder } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { useGetSettingsQuery, useSaveSettingsMutation } from 'app/extensions/api/clients/reporting';

import { AccessControlAction, FooterMode, type ReportsSettings, Theme } from '../types';

import { NoRendererInfoBox } from './RenderingWarnings';
import ReportBranding from './ReportBranding';

interface Props {
  onClose: () => void;
}

const normalizeFooterItemColor = (color?: string): string | undefined => {
  if (!color) {
    return undefined;
  }

  const parsed = tinycolor(color);
  if (!parsed.isValid()) {
    return undefined;
  }

  return parsed.toHexString();
};

const normalizeFooterItems = (footerItems?: ReportsSettings['footerItems']) =>
  footerItems?.map((item) => ({
    ...item,
    color: normalizeFooterItemColor(item.color),
  }));

const toFormValues = (settings?: ReportsSettings): ReportsSettings => ({
  pdfTheme: settings?.pdfTheme ?? Theme.Light,
  embeddedImageTheme: settings?.embeddedImageTheme ?? Theme.Dark,
  pdfHeaderEnabled: settings?.pdfHeaderEnabled ?? true,
  pdfTimeRangeEnabled: settings?.pdfTimeRangeEnabled ?? true,
  pdfDashboardTitleEnabled: settings?.pdfDashboardTitleEnabled ?? true,
  footerItems: normalizeFooterItems(settings?.footerItems) ?? [],
  footerFontFamily: settings?.footerFontFamily ?? '',
  branding: {
    reportLogoUrl: settings?.branding?.reportLogoUrl ?? '',
    emailLogoUrl: settings?.branding?.emailLogoUrl ?? '',
    emailFooterMode: settings?.branding?.emailFooterMode ?? FooterMode.None,
    emailFooterText: settings?.branding?.emailFooterText ?? '',
    emailFooterLink: settings?.branding?.emailFooterLink ?? '',
  },
});

export const ReportsSettingsDrawer = ({ onClose }: Props) => {
  const { data: settings, isLoading, isError } = useGetSettingsQuery();

  return (
    <Drawer
      title={t('reporting.settings.drawer-title', 'Report template settings')}
      subtitle={t('reporting.settings.settings-subtitle', 'Manage report template settings.')}
      size="md"
      onClose={onClose}
    >
      {isLoading && <LoadingPlaceholder text={t('share-report.settings.loading', 'Loading settings...')} />}
      {isError && <Alert title={t('reporting.settings.error', 'Failed to load settings')} severity="error" />}
      {!isLoading && !isError && !config.rendererAvailable && <NoRendererInfoBox variant="error" />}
      {!isLoading && !isError && config.rendererAvailable && (
        <ReportSettingsForm settings={settings} onClose={onClose} />
      )}
    </Drawer>
  );
};

const ReportSettingsForm = ({ settings, onClose }: { settings?: ReportsSettings; onClose: () => void }) => {
  const [saveSettings, { isLoading: isSavingSettings }] = useSaveSettingsMutation();
  const canEditSettings = contextSrv.hasPermission(AccessControlAction.ReportingSettingsWrite);

  const submitForm = async (formData: ReportsSettings) => {
    await saveSettings(formData).unwrap();
    onClose();
  };

  const formMethods = useForm<ReportsSettings>({
    defaultValues: toFormValues(settings),
  });

  const { handleSubmit } = formMethods;

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(submitForm)}>
        <ReportBranding />
        <Button
          type="submit"
          disabled={!canEditSettings || isSavingSettings}
          icon={isSavingSettings ? 'spinner' : undefined}
        >
          {isSavingSettings ? (
            <Trans i18nKey="reporting.settings.saving-button">Saving...</Trans>
          ) : (
            <Trans i18nKey="reporting.settings.save-button">Save</Trans>
          )}
        </Button>
      </form>
    </FormProvider>
  );
};
