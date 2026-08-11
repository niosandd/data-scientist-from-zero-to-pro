import { css } from '@emotion/css';
import { type ReactNode, useEffect, useState } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';

import { type GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { Collapse, Stack, Button, Field, Input, TextArea, FieldSet, useStyles2 } from '@grafana/ui';

import { ScopeSection } from '../form/AlertEnrichmentForm';
import { EnricherConfigSection } from '../form/EnricherConfigSection';
import type { AlertEnrichmentFormData } from '../form/form';

interface EnrichmentCreateFormPropsBase {
  form: UseFormReturn<AlertEnrichmentFormData>;
  llmEnabled: boolean;
  isSubmitting: boolean;
  onSubmit: (data: AlertEnrichmentFormData) => Promise<void>;
  onCancel: () => void;
  showScopeSection?: boolean;
}

interface EnrichmentCreateFormPropsCreate extends EnrichmentCreateFormPropsBase {
  mode: 'create';
}

interface EnrichmentCreateFormPropsEdit extends EnrichmentCreateFormPropsBase {
  mode: 'edit';
  isReadOnly: boolean;
  provisioningAlert?: ReactNode;
}

export type EnrichmentCreateFormProps = EnrichmentCreateFormPropsCreate | EnrichmentCreateFormPropsEdit;

/**
 * Shared form for create-enrichment (step 2) and edit-enrichment drawers:
 * name, description, timeout, and enricher config. Create mode hides the type selector (chosen in step 1).
 */
export function EnrichmentCreateForm(props: EnrichmentCreateFormProps) {
  const { form, llmEnabled, isSubmitting, onSubmit, onCancel, mode, showScopeSection = false } = props;
  const isCreate = mode === 'create';
  const isReadOnly = mode === 'edit' && props.isReadOnly;
  const provisioningAlert = mode === 'edit' ? props.provisioningAlert : null;
  const hideTypeSelector = isCreate;

  const description = form.watch('description');
  const timeout = form.watch('steps.0.timeout');
  const descriptionTrimmed = (description ?? '').trim();
  const timeoutTrimmed = (timeout ?? '').trim();
  const hasMoreOptionsData = descriptionTrimmed !== '' || timeoutTrimmed !== '';

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Edit (editable): auto-expand "More options" when description or timeout has a value
  useEffect(() => {
    if (!isCreate && !isReadOnly && hasMoreOptionsData) {
      setMoreOptionsOpen(true);
    }
  }, [isCreate, isReadOnly, hasMoreOptionsData]);

  const styles = useStyles2(getStyles);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack direction="column" gap={4}>
          {provisioningAlert}

          <FieldSet disabled={isReadOnly} className={isReadOnly ? styles.readOnlyFields : undefined}>
            <Stack direction="column" gap={4}>
              <Stack direction="column" gap={3}>
                <Field label={t('alert-enrichment-form.basic-info.name', 'Enrichment Name')} noMargin htmlFor="title">
                  <Input
                    {...form.register('title', {
                      required: t('alert-enrichment-form.basic-info.name-required', 'Name is required'),
                    })}
                    placeholder={t('alert-enrichment-form.basic-info.name-placeholder', 'my-enrichment')}
                    invalid={!!form.formState.errors.title}
                    id="title"
                  />
                </Field>

                {isReadOnly ? (
                  <Stack direction="column" gap={3}>
                    {descriptionTrimmed !== '' && (
                      <Field
                        label={t('alert-enrichment-form.basic-info.description', 'Description (Optional)')}
                        noMargin
                        htmlFor="description"
                      >
                        <TextArea {...form.register('description')} rows={2} id="description" />
                      </Field>
                    )}
                    {timeoutTrimmed !== '' && (
                      <Field
                        label={t('alert-enrichment-form.basic-info.timeout', 'Timeout')}
                        noMargin
                        description={t(
                          'alert-enrichment-form.basic-info.timeout-description',
                          'Maximum time allowed for this enrichment (e.g., 30s, 1m)'
                        )}
                        htmlFor="steps.0.timeout"
                      >
                        <Input
                          {...form.register('steps.0.timeout')}
                          placeholder={t('alert-enrichment-form.basic-info.timeout-placeholder', '30s')}
                          id="steps.0.timeout"
                        />
                      </Field>
                    )}
                  </Stack>
                ) : (
                  <Collapse
                    className={styles.moreOptionsCollapse}
                    label={t('alerting.enrichment.form.more-options', 'More options')}
                    isOpen={moreOptionsOpen}
                    onToggle={setMoreOptionsOpen}
                  >
                    <Stack direction="column" gap={3}>
                      <Field
                        label={t('alert-enrichment-form.basic-info.description', 'Description (Optional)')}
                        noMargin
                        htmlFor="description"
                      >
                        <TextArea {...form.register('description')} rows={2} id="description" />
                      </Field>
                      <Field
                        label={t('alert-enrichment-form.basic-info.timeout', 'Timeout')}
                        noMargin
                        description={t(
                          'alert-enrichment-form.basic-info.timeout-description',
                          'Maximum time allowed for this enrichment (e.g., 30s, 1m)'
                        )}
                        htmlFor="steps.0.timeout"
                      >
                        <Input
                          {...form.register('steps.0.timeout')}
                          placeholder={t('alert-enrichment-form.basic-info.timeout-placeholder', '30s')}
                          id="steps.0.timeout"
                        />
                      </Field>
                    </Stack>
                  </Collapse>
                )}
              </Stack>

              <EnricherConfigSection
                llmEnabled={llmEnabled}
                hideTypeSelector={hideTypeSelector}
                isReadOnly={isReadOnly}
                typeSelectorDisabled={!isCreate}
              />
              {showScopeSection && <ScopeSection />}
            </Stack>
          </FieldSet>

          <Stack direction="row" gap={1} justifyContent="flex-end" alignItems="center" wrap="wrap">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              {isReadOnly ? (
                <Trans i18nKey="alerting.enrichment.drawer.close">Close</Trans>
              ) : (
                <Trans i18nKey="alerting.common.cancel">Cancel</Trans>
              )}
            </Button>
            {!isReadOnly && (
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  isCreate ? (
                    <Trans i18nKey="alerting.enrichment.create-drawer.creating">Creating...</Trans>
                  ) : (
                    <Trans i18nKey="alerting.enrichment.drawer.saving">Saving...</Trans>
                  )
                ) : isCreate ? (
                  <Trans i18nKey="alerting.enrichment.create-drawer.create">Create</Trans>
                ) : (
                  <Trans i18nKey="alerting.enrichment.drawer.save">Save</Trans>
                )}
              </Button>
            )}
          </Stack>
        </Stack>
      </form>
    </FormProvider>
  );
}

function getStyles(theme: GrafanaTheme2) {
  const disabledBorder = theme.colors.action.disabledBackground ?? theme.colors.border.weak;
  return {
    readOnlyFields: css({
      '& input:hover, & input:focus, & textarea:hover, & textarea:focus': {
        borderColor: `${disabledBorder} !important`,
        boxShadow: 'none',
        outline: 'none',
      },
      '& [class*="input"]:hover, & [class*="input"]:focus': {
        borderColor: `${disabledBorder} !important`,
        boxShadow: 'none',
        outline: 'none',
      },
      '& button:hover, & button:focus': {
        outline: 'none',
      },
    }),

    moreOptionsCollapse: css({
      border: 'none',
      background: 'none',
      color: theme.colors.text.primary,
    }),
  };
}
