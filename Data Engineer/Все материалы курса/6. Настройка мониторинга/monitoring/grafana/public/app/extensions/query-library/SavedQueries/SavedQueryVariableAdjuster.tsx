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

// Sentinel value that means the user chose "Custom value" in the dropdown.
// Kept at module level so it's not recreated on every render.
const CUSTOM_VALUE = '__custom__';

type Props = {
  query: SavedQuery;
  overrides: Record<string, string>;
  onChangeOverrides: (overrides: Record<string, string>) => void;
};

export function applyTemplateVariableOverrides(
  savedQuery: SavedQuery,
  overrides: Record<string, string>
): { query: DataQuery; templateVariablesChanged: boolean } {
  const vars = getUnresolvedVariables(savedQuery.query);
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

// Card shown when the selected query contains unresolved template variables. Lets the user substitute
// each variable with a dashboard variable or a typed custom value before selecting the query.
export function SavedQueryVariableAdjuster({ query, overrides, onChangeOverrides }: Props) {
  const { triggerAnalyticsEvent } = useQueryLibraryContext();
  const styles = useStyles2(getStyles);
  // Tracks which variable's custom Input should be focused after the Combobox
  // triggers a state update. A ref avoids a stale-closure/re-render race with
  // the Input's ref callback, which fires synchronously during the commit phase.
  const pendingFocusVariable = useRef<string | null>(null);
  const unresolvedVariables = useMemo(() => getUnresolvedVariables(query.query), [query.query]);

  const variableOptions = useMemo(() => {
    return getTemplateSrv()
      .getVariables()
      .map((variable) => {
        const variableValue = `$\{${variable.name}\}`;
        return { label: variableValue, value: variableValue };
      });
  }, []);

  const variableOptionValues = useMemo(() => new Set(variableOptions.map((o) => o.value)), [variableOptions]);
  const comboboxOptions = useMemo(
    () => [
      {
        label: t('saved-queries.variable-adjuster.combobox.custom', 'Custom value'),
        value: CUSTOM_VALUE,
        group: 'Add',
      },
      ...variableOptions,
    ],
    [variableOptions]
  );

  if (unresolvedVariables.length === 0) {
    return null;
  }

  const isCustomValue = (value?: string) =>
    value === '' || (Boolean(value) && value !== CUSTOM_VALUE && !variableOptionValues.has(value!));
  const getSafeId = (variable: string) => `saved-query-template-var-${variable.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <Card noMargin className={styles.card}>
      <Card.Heading>
        <Stack direction="row" alignItems="center" gap={1}>
          <Icon name="info-circle" />
          <span>{t('saved-queries.variable-adjuster.title', 'Substitute your template variables')}</span>
        </Stack>
      </Card.Heading>
      <Card.Description>
        <Text element="p" color="secondary">
          <Trans i18nKey="saved-queries.variable-adjuster.description">
            We detected the following template variables in your query. This can be mapped to your existing data. (Note:
            the saved query will not be changed.)
          </Trans>
        </Text>

        <Box marginTop={2}>
          {/* role="group" gives context to screen readers when they Tab into the first dropdown */}
          <div
            role="group"
            aria-label={t('saved-queries.variable-adjuster.group-aria-label', 'Substitute your template variables')}
          >
            <Stack direction="column" gap={1.5}>
              {unresolvedVariables.map((variable, i) => {
                const overrideValue = overrides[variable];
                const isInCustomMode = isCustomValue(overrideValue);
                // Map the stored override back to a Combobox selection:
                // - custom mode (free text entered) → show the "Custom value" sentinel option
                // - known template variable → show it selected
                // - nothing stored yet → show placeholder (undefined)
                const comboValue = isInCustomMode
                  ? CUSTOM_VALUE
                  : overrideValue && variableOptionValues.has(overrideValue)
                    ? overrideValue
                    : undefined;

                return (
                  <Field key={'var' + i} label={variable} htmlFor={getSafeId(variable)} noMargin>
                    <Stack direction="column" gap={1}>
                      <Combobox
                        id={getSafeId(variable)}
                        placeholder={t('saved-queries.variable-adjuster.combobox.placeholder', 'Select value')}
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
                      {isInCustomMode && (
                        <Input
                          ref={(el) => {
                            if (el && pendingFocusVariable.current === variable) {
                              el.focus();
                              pendingFocusVariable.current = null;
                            }
                          }}
                          aria-label={t(
                            'saved-queries.variable-adjuster.custom.aria-label',
                            'Custom value to substitute for {{variable}}',
                            { variable }
                          )}
                          value={isCustomValue(overrideValue) ? overrideValue : ''}
                          placeholder={t('saved-queries.variable-adjuster.custom.placeholder', 'Enter custom value')}
                          onChange={(e) => {
                            onChangeOverrides({ ...overrides, [variable]: e.currentTarget.value });
                          }}
                        />
                      )}
                    </Stack>
                  </Field>
                );
              })}
            </Stack>
          </div>
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
