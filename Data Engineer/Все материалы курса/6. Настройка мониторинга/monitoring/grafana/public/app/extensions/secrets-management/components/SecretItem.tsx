import { css, cx } from '@emotion/css';
import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data/';
import { t, Trans } from '@grafana/i18n';
import { Badge, Button, ClipboardButton, ConfirmModal, Tag, Text, useStyles2 } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';
import { AccessControlAction } from 'app/extensions/types';

import { DECRYPT_ALLOW_LIST_LABEL_MAP } from '../constants';

interface SecretItemProps {
  secureValue: SecureValue;
  onEditSecureValue: (name: string) => void;
  onDeleteSecureValue: ({ name }: { name: string }) => void;
}

export function SecretItem({ secureValue, onEditSecureValue, onDeleteSecureValue }: SecretItemProps) {
  const styles = useStyles2(getStyles);

  const canEdit = contextSrv.hasPermission(AccessControlAction.SecretSecureValuesWrite);
  const canDelete = contextSrv.hasPermission(AccessControlAction.SecretSecureValuesDelete);

  // If this is undefined we will error out after the hooks
  const secureValueName = secureValue.metadata.name || '';
  const updatedAt = secureValue?.metadata?.annotations?.['grafana.app/updatedTimestamp'];

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const hasLabels = secureValue.metadata.labels && Object.keys(secureValue.metadata.labels).length > 0;
  const [isHeadingWrapped, setIsHeadingWrapped] = useState(!hasLabels);
  const itemRef = useRef<HTMLDivElement>(null);
  const debouncedResizeHandler = useMemo(() => {
    return debounce(
      () => {
        const { height } = itemRef?.current?.getBoundingClientRect() ?? { height: 0 };
        // inline is 26px, and wrapped is 62px+ (39px is in the middle of the two states).
        // if there are no labels, we need to pretend that we are in a wrapped state to push the margin onto the name
        setIsHeadingWrapped(height > 39 || !hasLabels);
      },
      150,
      { maxWait: 500 }
    );
  }, [hasLabels]);

  useEffect(() => {
    const handler = () => {
      debouncedResizeHandler();
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [debouncedResizeHandler]);

  if (secureValue.metadata.name === undefined) {
    console.error('BUG Found: SecureValue metadata.name is undefined but should not be at this point', secureValue);
    return null;
  }

  const handleEdit = () => {
    onEditSecureValue(secureValueName);
  };

  const handleDelete = () => {
    onDeleteSecureValue({ name: secureValueName });
  };

  const handleShowDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleHideDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <li className={cx(styles.li)}>
        <div ref={itemRef} className={cx([styles.headerContainer, isHeadingWrapped && 'wrapped'])}>
          <Text element="h2" variant="h4">
            {secureValueName}
            <ClipboardButton
              className={styles.copyButton}
              getText={() => secureValueName}
              size="sm"
              icon="copy"
              fill="text"
              variant="secondary"
              aria-label={t('secrets.item.copy-value-aria-label', 'Copy "{{value}}"', {
                value: secureValueName,
              })}
            />
          </Text>

          <div className={styles.tagsContainer}>
            {hasLabels &&
              Object.entries(secureValue.metadata.labels!)?.map(([name, value]) => (
                <Tag key={name} colorIndex={3} name={`${name}: ${value}`} />
              ))}
          </div>
          <div className={styles.headerActions}>
            {canEdit && (
              <Button
                fill="outline"
                icon="edit"
                size="sm"
                onClick={handleEdit}
                variant="secondary"
                aria-label={t('secrets.item.edit-item-aria-label', `Edit {{name}}`, {
                  name: secureValueName,
                })}
              >
                <Trans i18nKey="secrets.item.edit-item">Edit</Trans>
              </Button>
            )}

            {canDelete && (
              <Button
                icon="trash-alt"
                aria-label={t('secrets.item.delete-item-aria-label', `Delete {{name}}`, { name: secureValueName })}
                size="sm"
                variant="secondary"
                onClick={handleShowDeleteModal}
              />
            )}
          </div>
        </div>

        <div className={styles.keyValue}>
          <strong>
            <Trans i18nKey="secrets.item.label-description">Description:</Trans>
          </strong>
          <span>{secureValue.spec.description}</span>
        </div>

        <div className={styles.keyValue}>
          <strong>
            <Trans i18nKey="secrets.item.label-created">Created:</Trans>
          </strong>
          <span>{secureValue.metadata.creationTimestamp}</span>
        </div>

        {updatedAt && (
          <div className={styles.keyValue}>
            <strong>
              <Trans i18nKey="secrets.item.label-modified">Modified:</Trans>
            </strong>
            <span>{updatedAt}</span>
          </div>
        )}

        <div className={styles.keyValue}>
          <strong>
            <Trans i18nKey="secrets.item.label-decrypters">Decrypters:</Trans>
          </strong>
          <div className={styles.row}>
            {secureValue.spec.decrypters?.map((item) => {
              return (
                <Badge
                  className={styles.audienceBadge}
                  color="blue"
                  key={item}
                  text={DECRYPT_ALLOW_LIST_LABEL_MAP[item] ?? item}
                />
              );
            })}
          </div>
        </div>

        {!!secureValue.status.keeper && (
          <div className={styles.keyValue}>
            <Trans i18nKey="secrets.item.label-keeper" values={{ keeper: secureValue.status.keeper }}>
              <strong>Keeper:</strong>
              <span>{'{{keeper}}'}</span>
            </Trans>
          </div>
        )}
      </li>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onDismiss={handleHideDeleteModal}
        onConfirm={handleDelete}
        confirmText={t('secrets.item.delete-modal.delete-button', 'Delete')}
        confirmationText={t('secrets.item.delete-modal.confirm-text', 'delete')}
        title={t('secrets.item.delete-modal.title', 'Delete secret')}
        body={
          <Trans i18nKey="secrets.item.delete-modal.body" values={{ name: secureValueName }}>
            Are you sure you want to delete <code>{'{{name}}'}</code>?
          </Trans>
        }
        description={
          <Trans i18nKey="secrets.item.delete-modal.description">
            Deleting a secret is irreversible and will remove the secret from Grafana. Any references to this secret
            will be broken.
          </Trans>
        }
      />
    </>
  );
}

const ACTIONS_MARGIN = '108px'; // actions width + gap

const getStyles = (theme: GrafanaTheme2) => ({
  // Copy/paste from access-policies
  audienceBadge: css({
    backgroundColor: theme.colors.background.canvas,
    border: `1px solid ${theme.colors.border.medium}`,
    color: theme.colors.text.primary,
  }),
  headerContainer: css({
    display: 'flex',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginBottom: theme.spacing(2),
    minHeight: '24px', // height of actions (else they may be cut-off)s
    '&.wrapped > h2': {
      wordBreak: 'break-word',
      marginRight: ACTIONS_MARGIN,
    },
    overflow: 'hidden',
  }),
  headerActions: css({
    display: 'flex',
    gap: theme.spacing(1),
    backgroundColor: theme.colors.background.secondary, // for when toggling .wrapped
    position: 'absolute',
    right: 0,
    top: 0,
  }),
  li: css({
    position: 'relative',
    listStyle: 'none',
    backgroundColor: theme.colors.background.secondary,
    fontSize: theme.typography.body.fontSize,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    overflow: 'auto',
  }),

  heading: css({
    color: theme.colors.text.maxContrast,
    fontSize: theme.typography.h4.fontSize,
    margin: 0,
  }),
  row: css({
    alignItems: 'center',
    display: 'flex',
    gap: theme.spacing(0.5),
  }),
  copyButton: css({
    padding: `0 ${theme.spacing(0.5)}`,
    '& > svg': {
      margin: '0',
    },
  }),
  keyValue: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    minHeight: '24px', // sm button height
    gap: theme.spacing(1),

    '& > strong': {
      color: theme.colors.text.primary,
    },
  }),
  tagsContainer: css({
    display: 'flex',
    gap: theme.spacing(0.5),
    flex: '1 1 auto',
    marginRight: ACTIONS_MARGIN,
    flexWrap: 'wrap',
    '& > *': {
      wordBreak: 'break-word',
    },
    '.wrapped &': {
      marginRight: 0,
    },
  }),
});
