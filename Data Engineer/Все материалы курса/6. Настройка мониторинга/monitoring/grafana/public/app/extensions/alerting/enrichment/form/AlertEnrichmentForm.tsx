import {
  useForm,
  useFieldArray,
  Controller,
  type FieldArrayWithId,
  FormProvider,
  useFormContext,
  useWatch,
} from 'react-hook-form';

import { type SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import {
  Button,
  Field,
  Input,
  Combobox,
  IconButton,
  Stack,
  TextArea,
  Box,
  RadioButtonGroup,
  FieldSet,
  TextLink,
  Badge,
} from '@grafana/ui';
import { alertRuleApi } from 'app/features/alerting/unified/api/alertRuleApi';
import { GRAFANA_RULES_SOURCE_NAME } from 'app/features/alerting/unified/utils/datasource';
import { rulesNav } from 'app/features/alerting/unified/utils/navigation';

import { type Matcher } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnricherConfigSection } from './EnricherConfigSection';
import { getMatcherTypeOptions, type AlertEnrichmentFormData, getInitialFormData, type EnrichmentScope } from './form';

interface AlertEnrichmentFormProps {
  onSubmit: (data: AlertEnrichmentFormData) => void;
  onCancel: () => void;
  editPayload?: AlertEnrichmentFormData;
  isLoading?: boolean;
  llmEnabled?: boolean;
  readOnly?: boolean;
}

export function AlertEnrichmentForm({
  onSubmit,
  onCancel,
  editPayload,
  isLoading = false,
  llmEnabled = false,
  readOnly = false,
}: AlertEnrichmentFormProps) {
  const form = useForm<AlertEnrichmentFormData>({
    defaultValues: {
      ...getInitialFormData(),
      ...editPayload,
    },
  });

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = form;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack direction="column" gap={3}>
          <FieldSet disabled={readOnly}>
            <Stack direction="column" gap={3}>
              <Stack direction="column" gap={2}>
                <Field label={t('alert-enrichment-form.basic-info.name', 'Enrichment Name')} noMargin htmlFor="title">
                  <Input
                    {...register('title', {
                      required: t('alert-enrichment-form.basic-info.name-required', 'Name is required'),
                    })}
                    placeholder={t('alert-enrichment-form.basic-info.name-placeholder', 'my-enrichment')}
                    invalid={!!errors.title}
                    id="title"
                  />
                </Field>

                <Field
                  label={t('alert-enrichment-form.basic-info.description', 'Description (Optional)')}
                  noMargin
                  htmlFor="description"
                >
                  <TextArea {...register('description')} rows={2} id="description" />
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
                    {...register('steps.0.timeout')}
                    placeholder={t('alert-enrichment-form.basic-info.timeout-placeholder', '30s')}
                    id="steps.0.timeout"
                  />
                </Field>
              </Stack>

              <EnricherConfigSection llmEnabled={llmEnabled} />

              <ScopeSection />
            </Stack>
          </FieldSet>

          {/* Form Actions */}
          <Stack direction="row" gap={1}>
            {!readOnly && (
              <Button type="submit" variant="primary" disabled={isLoading}>
                <Trans i18nKey="alert-enrichment-form.actions.save" defaults="Save Enrichment" />
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
              <Trans i18nKey="alert-enrichment-form.actions.cancel" defaults="Cancel" />
            </Button>
          </Stack>
        </Stack>
      </form>
    </FormProvider>
  );
}

const getScopeOptions = (): Array<SelectableValue<EnrichmentScope>> => [
  { label: t('alert-enrichment-form.scope.global-scoped', 'Global scoped'), value: 'global' },
  { label: t('alert-enrichment-form.scope.label-scoped', 'Label scoped'), value: 'label' },
  { label: t('alert-enrichment-form.scope.annotation-scoped', 'Annotation scoped'), value: 'annotation' },
];

export function ScopeSection() {
  const { control } = useFormContext<AlertEnrichmentFormData>();

  const scopeOptions = getScopeOptions();

  const scope = useWatch({ control, name: 'scope' });
  const alertRuleUids = useWatch({ control, name: 'alertRuleUids' });

  const {
    fields: labelMatchersFields,
    append: appendLabelMatcher,
    remove: removeLabelMatcher,
  } = useFieldArray({
    control,
    name: 'labelMatchers',
  });

  const {
    fields: annotationMatchersFields,
    append: appendAnnotationMatcher,
    remove: removeAnnotationMatcher,
  } = useFieldArray({
    control,
    name: 'annotationMatchers',
  });

  const isRuleScoped = alertRuleUids && alertRuleUids.length > 0;

  if (isRuleScoped) {
    return (
      <Field
        label={t('alert-enrichment-form.scope.title', 'Scope')}
        description={
          alertRuleUids.length === 1
            ? t(
                'alert-enrichment-form.scope.rule-scoped-description',
                'This enrichment will be applied to the following rule:'
              )
            : t(
                'alert-enrichment-form.scope.rules-scoped-description',
                'This enrichment will be applied to the following rules:'
              )
        }
        noMargin
      >
        <Stack direction="column" gap={1}>
          {alertRuleUids.map((ruleUid) => (
            <RuleLink key={ruleUid} ruleUid={ruleUid} />
          ))}
        </Stack>
      </Field>
    );
  }

  return (
    <Field
      label={t('alert-enrichment-form.scope.title', 'Scope')}
      description={t('alert-enrichment-form.scope.description', 'Define which alerts should be enriched')}
      noMargin
    >
      <Stack direction="column" gap={2}>
        <Box>
          <Controller
            name="scope"
            control={control}
            render={({ field: { ref, ...field } }) => <RadioButtonGroup options={scopeOptions} {...field} />}
          />
        </Box>
        {scope === 'label' && (
          <MatcherFields
            fields={labelMatchersFields}
            append={appendLabelMatcher}
            remove={removeLabelMatcher}
            name="labelMatchers"
          />
        )}
        {scope === 'annotation' && (
          <MatcherFields
            fields={annotationMatchersFields}
            append={appendAnnotationMatcher}
            remove={removeAnnotationMatcher}
            name="annotationMatchers"
          />
        )}
      </Stack>
    </Field>
  );
}

interface MatcherFieldsProps {
  fields: Array<FieldArrayWithId<AlertEnrichmentFormData, 'labelMatchers' | 'annotationMatchers'>>;
  append: (value: Matcher) => void;
  remove: (index: number) => void;
  name: 'labelMatchers' | 'annotationMatchers';
}

function MatcherFields({ fields, append, remove, name }: MatcherFieldsProps) {
  const { control, register } = useFormContext<AlertEnrichmentFormData>();
  const matcherTypeOptions = getMatcherTypeOptions();

  return (
    <Stack direction="column" gap={1}>
      {fields.map((field, index) => (
        <Stack key={field.id} direction="row" gap={1}>
          <Field
            label={t('alert-enrichment-form.matcher.name-label', 'Name')}
            noMargin
            htmlFor={`${name}.${index}.name`}
          >
            <Input
              {...register(`${name}.${index}.name`)}
              placeholder={t('alert-enrichment-form.matcher.name-placeholder', 'Name')}
              type="text"
              id={`${name}.${index}.name`}
            />
          </Field>
          <Field
            label={t('alert-enrichment-form.matcher.type-label', 'Type')}
            noMargin
            htmlFor={`${name}.${index}.type`}
          >
            <Controller
              name={`${name}.${index}.type`}
              control={control}
              render={({ field: { ref, onChange, ...field } }) => (
                <Combobox
                  {...field}
                  id={`${name}.${index}.type`}
                  options={matcherTypeOptions}
                  onChange={(option) => onChange(option?.value)}
                  placeholder={t('alert-enrichment-form.matcher.type-placeholder', 'Type')}
                />
              )}
            />
          </Field>
          <Field
            label={t('alert-enrichment-form.matcher.value-label', 'Value')}
            noMargin
            htmlFor={`${name}.${index}.value`}
          >
            <Input
              {...register(`${name}.${index}.value`)}
              placeholder={t('alert-enrichment-form.matcher.value-placeholder', 'Value')}
              type="text"
              id={`${name}.${index}.value`}
            />
          </Field>
          <IconButton
            name="trash-alt"
            onClick={() => remove(index)}
            tooltip={t('alert-enrichment-form.matcher.remove-tooltip', 'Remove matcher')}
            aria-label={t('alert-enrichment-form.matcher.remove-aria-label', 'Remove matcher')}
          />
        </Stack>
      ))}
      <div>
        <Button variant="secondary" icon="plus" size="sm" onClick={() => append({ name: '', type: '=', value: '' })}>
          <Trans i18nKey="alert-enrichment-form.matcher.add-button" defaults="Add" />
        </Button>
      </div>
    </Stack>
  );
}

interface RuleLinkProps {
  ruleUid: string;
}

export function RuleLink({ ruleUid }: RuleLinkProps) {
  const { data: alertRule, isLoading, error } = alertRuleApi.endpoints.getAlertRule.useQuery({ uid: ruleUid });

  if (isLoading) {
    return null;
  }

  if (error || !alertRule) {
    return (
      <Badge
        color="red"
        text={t('alert-enrichment-form.scope.rule-not-found', 'Rule not found ({{ruleUid}})', { ruleUid })}
      />
    );
  }

  const ruleName = alertRule.grafana_alert.title;
  const ruleIdentifier = { uid: ruleUid, ruleSourceName: 'grafana' as const };
  const ruleViewUrl = rulesNav.detailsPageLink(GRAFANA_RULES_SOURCE_NAME, ruleIdentifier);

  return (
    <TextLink href={ruleViewUrl} color="primary">
      {ruleName}
    </TextLink>
  );
}
