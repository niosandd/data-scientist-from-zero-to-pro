import { css, cx } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { IconButton, Tooltip, useStyles2 } from '@grafana/ui';

interface Props {
  name: string;
  disabled?: boolean;
  onRemove: (recipient: string) => void;
}

/**
 * @internal
 * Only used internally by ReportRecipientInput
 * */
export const RecipientItem = ({ name, disabled, onRemove }: Props) => {
  const styles = useStyles2(getStyles);

  return (
    <li className={cx(styles.itemStyle, styles.defaultRecipientColor)}>
      <Tooltip content={name}>
        <span className={styles.nameStyle}>{name}</span>
      </Tooltip>
      <IconButton
        name="times"
        size="lg"
        disabled={disabled}
        tooltip={t('share-report.recipient-input.remove', 'Remove recipient: {{name}}', { name })}
        onClick={() => onRemove(name)}
        className={styles.buttonStyles}
      />
    </li>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  const height = theme.spacing.gridSize * 3;

  return {
    itemStyle: css({
      display: 'flex',
      gap: '3px',
      alignItems: 'center',
      height: `${height}px`,
      lineHeight: `${height - 2}px`,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: theme.shape.radius.default,
      padding: `0 ${theme.spacing(0.5)}`,
      whiteSpace: 'nowrap',
      textShadow: 'none',
      fontWeight: 500,
      fontSize: theme.typography.size.sm,
      color: '#fff',
    }),
    defaultRecipientColor: css({
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.components.input.borderColor,
      color: theme.colors.text.primary,
    }),
    nameStyle: css({
      maxWidth: '25ch',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    }),
    buttonStyles: css({
      margin: 0,
      '&:hover::before': {
        display: 'none',
      },
    }),
  };
};
