import { css } from '@emotion/css';
import { useMemo, useRef } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { getTemplateSrv } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { Box, Card, Combobox, Field, Icon, Input, Stack, Text, useStyles2 } from '@grafana/ui';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { getUnresolvedVariables, replaceUnresolvedVariables } from '../utils/templateVariables';

export interface QueryLibraryVariableAdjusterProps {
  query: SavedQuery;
  overrides: Record<string, string>;
  onChangeOverrides: (overrides: Record<string, string>) => void;
}

function getUniqueUnresolvedTemplateVariables(savedQuery: SavedQuery): string[] {
  return getUnresolvedVariables(savedQuery.query);
}

export function applyTemplateVariableOverrides(
  savedQuery: SavedQuery,
  overrides: Record<string, string>
): { query: DataQuery; templateVariablesChanged: boolean } {
  const vars = getUniqueUnresolvedTemplateVariables(savedQuery);
  const normalizedOverrides = vars.reduce((acc: Record<string, string>, variable: string) => {
    const raw = overrides?.[variable];
    const isWhitespace = typeof raw === 'string' ? raw.trim() === '' : false;
    // If custom is selected but empty (or whitespace), don't replace at all.
    acc[variable] = !isWhitespace ? raw : variable;
    return acc;
  }, {});

  const templateVariablesChanged = vars.some((variable) => {
    const raw = overrides?.[variable];
    const isWhitespace = typeof raw === 'string' ? raw.trim() === '' : false;
    const effective = !isWhitespace ? raw : variable;
    return effective !== variable;
  });

  return {
    query: replaceUnresolvedVariables(savedQuery.query, normalizedOverrides),
    templateVariablesChanged,
  };
}

export function QueryLibraryVariableAdjuster({
  query,
  overrides,
  onChangeOverrides,
}: QueryLibraryVariableAdjusterProps) {
  const { triggerAnalyticsEvent } = useQueryLibraryContext();
  const styles = useStyles2(getStyles);
  const pendingFocusVariable = useRef<string | null>(null);
  const unresolvedVariables = useMemo(() => getUniqueUnresolvedTemplateVariables(query), [query]);

  const CUSTOM_VALUE = '__custom__';

  const variableOptions = useMemo(() => {
    return getTemplateSrv()
      .getVariables()
      .map((variable) => {
        const variableValue = `$\{${variable.name}\}`;
        return {
          label: variableValue,
          value: variableValue,
        };
      });
  }, []);

  const variableOptionValues = useMemo(() => new Set(variableOptions.map((o) => o.value)), [variableOptions]);
  const comboboxOptions = useMemo(() => {
    return [
      {
        label: t('query-library.variable-adjust-alert.combobox.custom', 'Custom value'),
        value: CUSTOM_VALUE,
        group: 'Add',
      },
      ...variableOptions,
    ];
  }, [CUSTOM_VALUE, variableOptions]);

  if (unresolvedVariables.length === 0) {
    return null;
  }

  const isCustomValue = (value?: string) =>
    value === '' || (Boolean(value) && value !== CUSTOM_VALUE && !variableOptionValues.has(value!));
  const getSafeId = (variable: string) => `query-library-template-var-${variable.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <Card noMargin className={styles.card}>
      <Card.Heading>
        <Stack direction="row" alignItems="center" gap={1}>
          <Icon name="info-circle" />
          <span>{t('query-library.variable-adjust-alert.title', 'Substitute your template variables')}</span>
        </Stack>
      </Card.Heading>
      <Card.Description>
        <Text element="p" color="secondary">
          <Trans i18nKey="query-library.variable-adjust-alert.description">
            We detected the following template variables in your query. This can be mapped to your existing data. (Note:
            the saved query will not be changed.)
          </Trans>
        </Text>

        <Box marginTop={2}>
          <Stack direction="column" gap={1.5}>
            {unresolvedVariables.map((variable, i) => (
              <Field key={'var' + i} label={variable} htmlFor={getSafeId(variable)} noMargin>
                <Stack direction="column" gap={1}>
                  {(() => {
                    const overrideValue = overrides[variable];
                    const isInCustomMode = isCustomValue(overrideValue);

                    const comboValue = isInCustomMode
                      ? CUSTOM_VALUE
                      : overrideValue && variableOptionValues.has(overrideValue)
                        ? overrideValue
                        : undefined;

                    return (
                      <>
                        <Combobox
                          id={getSafeId(variable)}
                          placeholder={t('query-library.variable-adjust-alert.combobox.placeholder', 'Select value')}
                          value={comboValue}
                          options={comboboxOptions}
                          isClearable={true}
                          onChange={(opt) => {
                            const selected = opt?.value;
                            if (!selected) {
                              const next = { ...overrides };
                              delete next[variable];
                              onChangeOverrides(next);
                              triggerAnalyticsEvent(QueryLibraryInteractions.variableAdjusterCleared);
                              return;
                            }

                            if (selected === CUSTOM_VALUE) {
                              pendingFocusVariable.current = variable;
                              onChangeOverrides({ ...overrides, [variable]: '' });
                              triggerAnalyticsEvent(QueryLibraryInteractions.variableAdjusterCustomSelected);
                              return;
                            }

                            onChangeOverrides({ ...overrides, [variable]: selected });
                            triggerAnalyticsEvent(QueryLibraryInteractions.variableAdjusterTemplateVariableSelected);
                          }}
                        />

                        {/* If the user selects "Custom value", show a text input used on query selection. */}
                        {isInCustomMode && (
                          <Input
                            ref={(el) => {
                              if (el && pendingFocusVariable.current === variable) {
                                el.focus();
                                pendingFocusVariable.current = null;
                              }
                            }}
                            aria-label={t(
                              'query-library.variable-adjust-alert.custom.ariaLabel',
                              'Custom value to substitute for {{variable}}',
                              { variable }
                            )}
                            value={isCustomValue(overrideValue) ? overrideValue : ''}
                            placeholder={t(
                              'query-library.variable-adjust-alert.custom.placeholder',
                              'Enter custom value'
                            )}
                            onChange={(e) => {
                              onChangeOverrides({ ...overrides, [variable]: e.currentTarget.value });
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </Stack>
              </Field>
            ))}
          </Stack>
        </Box>
      </Card.Description>
    </Card>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  card: css({
    background: 'transparent',
    border: `1px solid ${theme.colors.border.medium}`,
    marginBottom: theme.spacing(1),
    maxHeight: theme.spacing(35),
    overflowY: 'auto',
  }),
});
