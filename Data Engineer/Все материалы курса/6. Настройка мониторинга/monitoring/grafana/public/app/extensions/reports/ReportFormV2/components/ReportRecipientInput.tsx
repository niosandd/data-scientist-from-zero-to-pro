import { css, cx } from '@emotion/css';
import { useCallback, useState, forwardRef } from 'react';
import * as React from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { Button, Input, useStyles2 } from '@grafana/ui';

import { RecipientItem } from './RecipientItem';

const CLASS_NAME = 'report-recipient-input';

export interface Props {
  placeholder?: string;
  /** Array of selected recipients */
  recipients?: string[];
  onChange: (recipients: string[]) => void;
  id?: string;
  /** Toggle disabled state */
  disabled?: boolean;
  /** Enable adding new recipients when input loses focus */
  addOnBlur?: boolean;
  /** Toggle invalid state */
  invalid?: boolean;
}

/**
 * An input field for adding report recipients (email addresses).
 */
export const ReportRecipientInput = forwardRef<HTMLInputElement, Props>(
  ({ placeholder: placeholderProp, recipients = [], onChange, disabled, addOnBlur, invalid, id }, ref) => {
    const placeholder =
      placeholderProp ??
      t('share-report.recipient-input.placeholder', "Type in the recipients' email addresses and press Enter");
    const [newRecipientName, setNewRecipientName] = useState('');
    const styles = useStyles2(getStyles);

    const onNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setNewRecipientName(event.target.value);
    }, []);

    const onRemove = (recipientToRemove: string) => {
      onChange(recipients.filter((x) => x !== recipientToRemove));
    };

    const onAdd = (event?: React.MouseEvent | React.KeyboardEvent) => {
      event?.preventDefault();
      if (!recipients.includes(newRecipientName)) {
        onChange(recipients.concat(newRecipientName));
      }
      setNewRecipientName('');
    };

    const onBlur = () => {
      if (addOnBlur && newRecipientName) {
        onAdd();
      }
    };

    const onKeyboardAdd = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && newRecipientName !== '') {
        onAdd(event);
      }
    };

    return (
      <div className={cx(styles.wrapper, CLASS_NAME)}>
        <Input
          ref={ref}
          id={id}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onNameChange}
          value={newRecipientName}
          onKeyDown={onKeyboardAdd}
          onBlur={onBlur}
          invalid={invalid}
          suffix={
            <Button
              fill="text"
              className={styles.addButtonStyle}
              onClick={onAdd}
              size="md"
              disabled={newRecipientName.length <= 0}
            >
              <Trans i18nKey="share-report.recipient-input.add">Add</Trans>
            </Button>
          }
        />
        {recipients?.length > 0 && (
          <ul className={styles.recipients}>
            {recipients.map((recipient) => (
              <RecipientItem key={recipient} name={recipient} onRemove={onRemove} disabled={disabled} />
            ))}
          </ul>
        )}
      </div>
    );
  }
);

ReportRecipientInput.displayName = 'ReportRecipientInput';

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    minHeight: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  }),
  recipients: css({
    display: 'flex',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  }),
  addButtonStyle: css({
    margin: `0 -${theme.spacing(1)}`,
  }),
});
