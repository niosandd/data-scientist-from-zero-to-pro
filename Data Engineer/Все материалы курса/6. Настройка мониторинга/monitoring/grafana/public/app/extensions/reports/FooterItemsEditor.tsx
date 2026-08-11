import { css } from '@emotion/css';
import { useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

import { type GrafanaTheme2, type SelectableValue } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { ColorPickerInput, Field, Icon, IconButton, Input, Select, Text, useStyles2 } from '@grafana/ui';

import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_DATE_FORMAT,
  FOOTER_ITEM_TYPES,
  type FooterItemType,
  MAX_FIXED_TEXT_LENGTH,
  MAX_FOOTER_ITEMS,
  type ReportsSettings,
} from '../types';

const textItemTypes: FooterItemType[] = ['pageNumber', 'date', 'fixedText'];

const FONT_FAMILIES = ['Helvetica', 'Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New'];

const dateFormatOptions: Array<SelectableValue<string>> = DATE_FORMAT_OPTIONS.map((value) => ({ label: value, value }));

const fontSizeOptions: Array<SelectableValue<string>> = [
  { label: '8px', value: '8' },
  { label: '10px', value: '10' },
  { label: '12px', value: '12' },
  { label: '14px', value: '14' },
  { label: '16px', value: '16' },
  { label: '18px', value: '18' },
];

function getGlobalFontFamilyOptions(): Array<SelectableValue<string>> {
  return [
    { label: t('reporting.settings.footer-font-inter', 'Inter (Default)'), value: '' },
    ...FONT_FAMILIES.map((f) => ({ label: f, value: f })),
  ];
}

function getFooterItemTypeOptions(): Array<SelectableValue<FooterItemType>> {
  return [
    {
      label: t('reporting.settings.footer-type-page-number', 'Page number'),
      value: 'pageNumber',
    },
    {
      label: t('reporting.settings.footer-type-date', 'Date'),
      value: 'date',
    },
    {
      label: t('reporting.settings.footer-type-fixed-text', 'Fixed text'),
      value: 'fixedText',
    },
    {
      label: t('reporting.settings.footer-type-logo', 'Logo'),
      value: 'logo',
    },
    {
      label: t('reporting.settings.footer-type-flex-spacer', 'Flex spacer'),
      value: 'flexSpacer',
    },
  ];
}

function getLogoHeightOptions(): Array<SelectableValue<string>> {
  return [
    { label: t('reporting.settings.footer-logo-small', 'Small (24px)'), value: '24' },
    { label: t('reporting.settings.footer-logo-medium', 'Medium (36px)'), value: '36' },
    { label: t('reporting.settings.footer-logo-large', 'Large (48px)'), value: '48' },
    { label: t('reporting.settings.footer-logo-xlarge', 'Extra large (64px)'), value: '64' },
  ];
}

function getFontWeightOptions(): Array<SelectableValue<string>> {
  return [
    { label: t('reporting.settings.footer-weight-normal', 'Normal'), value: 'normal' },
    { label: t('reporting.settings.footer-weight-bold', 'Bold'), value: 'bold' },
  ];
}

function getFontStyleOptions(): Array<SelectableValue<string>> {
  return [
    { label: t('reporting.settings.footer-style-normal', 'Normal'), value: 'normal' },
    { label: t('reporting.settings.footer-style-italic', 'Italic'), value: 'italic' },
  ];
}

function isTextItem(type: FooterItemType): boolean {
  return textItemTypes.includes(type);
}

function isValidFooterItemType(type: string): type is FooterItemType {
  return (FOOTER_ITEM_TYPES as readonly string[]).includes(type);
}

function getItemLabel(type: FooterItemType, options: Array<SelectableValue<FooterItemType>>): string {
  return options.find((option) => option.value === type)?.label ?? type;
}

function getDefaultValue(type: FooterItemType): string | undefined {
  switch (type) {
    case 'date':
      return DEFAULT_DATE_FORMAT;
    case 'logo':
      return '36';
    default:
      return undefined;
  }
}

function getExpandedIndexAfterMove(expandedIndex: number | null, from: number, to: number): number | null {
  if (expandedIndex === null) {
    return null;
  }
  if (expandedIndex === from) {
    return to;
  }
  if (expandedIndex > from && expandedIndex <= to) {
    return expandedIndex - 1;
  }
  if (expandedIndex < from && expandedIndex >= to) {
    return expandedIndex + 1;
  }
  return expandedIndex;
}

export function FooterItemsEditor() {
  const styles = useStyles2(getStyles);
  const { control, register } = useFormContext<ReportsSettings>();
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'footerItems',
  });
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const itemTypeOptions = getFooterItemTypeOptions();

  const onAddItem = (type: FooterItemType) => {
    append({ type, value: getDefaultValue(type) });
  };

  const onMoveItem = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) {
      return;
    }

    move(from, to);
    setExpandedIndex(getExpandedIndexAfterMove(expandedIndex, from, to));
  };

  return (
    <div className={styles.container}>
      <Text element="h5">
        <Trans i18nKey="reporting.settings.pdf-footer-header">Footer</Trans>
      </Text>
      <Text variant="bodySmall" color="secondary">
        <Trans i18nKey="reporting.settings.pdf-footer-description">
          Configure the items displayed in the PDF footer. Use the arrows to reorder.
        </Trans>
      </Text>

      <Controller
        control={control}
        name="footerFontFamily"
        render={({ field: { onChange, value } }) => {
          const options = getGlobalFontFamilyOptions();
          return (
            <Field
              label={t('reporting.settings.footer-font-family-label', 'Font family')}
              description={t(
                'reporting.settings.footer-font-family-description',
                'Default font for all footer text items.'
              )}
            >
              <Select
                options={options}
                value={options.find((o) => o.value === value) ?? options[0]}
                onChange={(option) => onChange(option.value ?? '')}
                className={styles.fontFamilySelect}
              />
            </Field>
          );
        }}
      />

      <ul className={styles.list}>
        {fields.length === 0 && (
          <Text variant="bodySmall" color="secondary" italic>
            <Trans i18nKey="reporting.settings.pdf-footer-empty-state">
              No custom footer items configured. The default footer will be used. Add items below to customize.
            </Trans>
          </Text>
        )}
        {fields.map((field, index) => {
          const rawType = field.type as string;

          if (!isValidFooterItemType(rawType)) {
            return (
              <li key={field.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <div className={styles.itemLabel}>
                    <Text variant="bodySmall" weight="medium" color="warning">
                      <Icon name="exclamation-triangle" size="sm" />{' '}
                      {t('reporting.settings.footer-unsupported-type', 'Unsupported: {{type}}', { type: rawType })}
                    </Text>
                  </div>
                  <div className={styles.itemConfig} />
                  <IconButton
                    name="angle-up"
                    size="sm"
                    disabled={index === 0}
                    tooltip={t('reporting.settings.footer-move-item-up-label', 'Move {{label}} up', { label: rawType })}
                    onClick={() => onMoveItem(index, index - 1)}
                  />
                  <IconButton
                    name="angle-down"
                    size="sm"
                    disabled={index === fields.length - 1}
                    tooltip={t('reporting.settings.footer-move-item-down-label', 'Move {{label}} down', {
                      label: rawType,
                    })}
                    onClick={() => onMoveItem(index, index + 1)}
                  />
                  <IconButton
                    name="trash-alt"
                    size="sm"
                    tooltip={t('reporting.settings.footer-remove-item-label', 'Remove {{label}}', { label: rawType })}
                    onClick={() => {
                      remove(index);
                      if (expandedIndex === index) {
                        setExpandedIndex(null);
                      } else if (expandedIndex !== null && expandedIndex > index) {
                        setExpandedIndex(expandedIndex - 1);
                      }
                    }}
                  />
                </div>
              </li>
            );
          }

          const type = rawType;
          const label = getItemLabel(type, itemTypeOptions);
          const labelId = `footer-item-label-${field.id}`;

          return (
            <li key={field.id} className={styles.item}>
              <div className={styles.itemRow}>
                <div className={styles.itemLabel}>
                  <Text id={labelId} variant="bodySmall" weight="medium">
                    {label}
                  </Text>
                </div>
                <div className={styles.itemConfig}>
                  <FooterItemConfig index={index} type={type} labelId={labelId} register={register} control={control} />
                </div>
                <IconButton
                  name="angle-up"
                  size="sm"
                  disabled={index === 0}
                  tooltip={t('reporting.settings.footer-move-item-up-label', 'Move {{label}} up', { label })}
                  onClick={() => onMoveItem(index, index - 1)}
                />
                <IconButton
                  name="angle-down"
                  size="sm"
                  disabled={index === fields.length - 1}
                  tooltip={t('reporting.settings.footer-move-item-down-label', 'Move {{label}} down', { label })}
                  onClick={() => onMoveItem(index, index + 1)}
                />
                {isTextItem(type) && (
                  <IconButton
                    name="cog"
                    size="sm"
                    tooltip={t('reporting.settings.footer-style-toggle-label', 'Toggle {{label}} style options', {
                      label,
                    })}
                    aria-expanded={expandedIndex === index}
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  />
                )}
                <IconButton
                  name="trash-alt"
                  size="sm"
                  tooltip={t('reporting.settings.footer-remove-item-label', 'Remove {{label}}', { label })}
                  onClick={() => {
                    remove(index);
                    if (expandedIndex === index) {
                      setExpandedIndex(null);
                    } else if (expandedIndex !== null && expandedIndex > index) {
                      setExpandedIndex(expandedIndex - 1);
                    }
                  }}
                />
              </div>
              {isTextItem(type) && expandedIndex === index && <FooterItemStyleConfig index={index} control={control} />}
            </li>
          );
        })}
      </ul>

      <AddFooterItemButton onAdd={onAddItem} disabled={fields.length >= MAX_FOOTER_ITEMS} options={itemTypeOptions} />
    </div>
  );
}

interface FooterItemConfigProps {
  index: number;
  type: FooterItemType;
  labelId: string;
  register: ReturnType<typeof useFormContext<ReportsSettings>>['register'];
  control: ReturnType<typeof useFormContext<ReportsSettings>>['control'];
}

function FooterItemConfig({ index, type, labelId, register, control }: FooterItemConfigProps) {
  const styles = useStyles2(getStyles);

  switch (type) {
    case 'fixedText':
      return (
        <Input
          {...register(`footerItems.${index}.value`)}
          maxLength={MAX_FIXED_TEXT_LENGTH}
          placeholder={t('reporting.settings.footer-fixed-text-placeholder', 'Enter text...')}
          aria-labelledby={labelId}
          className={styles.inlineControl}
        />
      );
    case 'date':
      return (
        <Controller
          control={control}
          name={`footerItems.${index}.value`}
          render={({ field: { onChange, value } }) => (
            <Select
              options={dateFormatOptions}
              value={dateFormatOptions.find((o) => o.value === value) ?? dateFormatOptions[0]}
              onChange={(option) => onChange(option.value)}
              aria-labelledby={labelId}
              className={styles.inlineControl}
            />
          )}
        />
      );
    case 'logo':
      return (
        <Controller
          control={control}
          name={`footerItems.${index}.value`}
          render={({ field: { onChange, value } }) => {
            const options = getLogoHeightOptions();
            return (
              <Select
                options={options}
                value={
                  options.find((o) => o.value === value) ??
                  options.find((o) => o.value === getDefaultValue('logo')) ??
                  options[0]
                }
                onChange={(option) => onChange(option.value)}
                aria-labelledby={labelId}
                className={styles.inlineControl}
              />
            );
          }}
        />
      );
    default:
      return null;
  }
}

interface FooterItemStyleConfigProps {
  index: number;
  control: ReturnType<typeof useFormContext<ReportsSettings>>['control'];
}

function FooterItemStyleConfig({ index, control }: FooterItemStyleConfigProps) {
  const styles = useStyles2(getStyles);
  const weightOptions = getFontWeightOptions();
  const styleOptions = getFontStyleOptions();

  return (
    <div className={styles.styleRow}>
      <Controller
        control={control}
        name={`footerItems.${index}.fontSize`}
        render={({ field: { onChange, value } }) => (
          <Field label={t('reporting.settings.footer-font-size', 'Size')} className={styles.styleField}>
            <Select
              options={fontSizeOptions}
              value={fontSizeOptions.find((o) => o.value === value) ?? null}
              onChange={(option) => onChange(option?.value)}
              placeholder={t('reporting.settings.footer-font-size-default', 'Default')}
              isClearable
              className={styles.styleSelect}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`footerItems.${index}.fontWeight`}
        render={({ field: { onChange, value } }) => (
          <Field label={t('reporting.settings.footer-font-weight', 'Weight')} className={styles.styleField}>
            <Select
              options={weightOptions}
              value={weightOptions.find((o) => o.value === value) ?? null}
              onChange={(option) => onChange(option?.value)}
              placeholder={t('reporting.settings.footer-font-weight-default', 'Normal')}
              isClearable
              className={styles.styleSelect}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`footerItems.${index}.fontStyle`}
        render={({ field: { onChange, value } }) => (
          <Field label={t('reporting.settings.footer-font-style', 'Style')} className={styles.styleField}>
            <Select
              options={styleOptions}
              value={styleOptions.find((o) => o.value === value) ?? null}
              onChange={(option) => onChange(option?.value)}
              placeholder={t('reporting.settings.footer-font-style-default', 'Normal')}
              isClearable
              className={styles.styleSelect}
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name={`footerItems.${index}.color`}
        render={({ field: { onChange, value } }) => (
          <Field label={t('reporting.settings.footer-font-color', 'Color')} className={styles.styleField}>
            <ColorPickerInput
              value={value ?? ''}
              onChange={onChange}
              returnColorAs="hex"
              placeholder={t('reporting.settings.footer-font-color-placeholder', '#000000')}
              className={styles.styleColorPicker}
            />
          </Field>
        )}
      />
    </div>
  );
}

function AddFooterItemButton({
  onAdd,
  disabled,
  options,
}: {
  onAdd: (type: FooterItemType) => void;
  disabled?: boolean;
  options: Array<SelectableValue<FooterItemType>>;
}) {
  const styles = useStyles2(getStyles);

  return (
    <Select
      options={options}
      onChange={(option) => {
        if (option.value) {
          onAdd(option.value);
        }
      }}
      value={null}
      disabled={disabled}
      aria-label={t('reporting.settings.footer-add-item-aria', 'Add footer item')}
      placeholder={
        disabled
          ? t('reporting.settings.footer-max-items-reached', 'Maximum items reached')
          : t('reporting.settings.footer-add-item', '+ Add footer item')
      }
      className={styles.addButton}
    />
  );
}

function itemBase(theme: GrafanaTheme2) {
  return {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.radius.default,
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      marginTop: theme.spacing(2),
    }),
    fontFamilySelect: css({
      maxWidth: theme.spacing(30),
    }),
    list: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      minHeight: theme.spacing(4),
      listStyle: 'none',
      padding: 0,
      margin: 0,
    }),
    item: css({
      ...itemBase(theme),
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
    }),
    itemRow: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    }),
    itemLabel: css({
      minWidth: theme.spacing(12),
      flexShrink: 0,
    }),
    itemConfig: css({
      flex: 1,
      minWidth: 0,
    }),
    inlineControl: css({
      maxWidth: theme.spacing(25),
    }),
    addButton: css({
      maxWidth: theme.spacing(30),
    }),
    styleRow: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
      paddingTop: theme.spacing(0.5),
      borderTop: `1px solid ${theme.colors.border.weak}`,
      marginTop: theme.spacing(0.5),
    }),
    styleField: css({
      marginBottom: 0,
      minWidth: theme.spacing(12),
    }),
    styleSelect: css({
      minWidth: theme.spacing(12),
    }),
    styleColorPicker: css({
      maxWidth: theme.spacing(16),
    }),
  };
}
