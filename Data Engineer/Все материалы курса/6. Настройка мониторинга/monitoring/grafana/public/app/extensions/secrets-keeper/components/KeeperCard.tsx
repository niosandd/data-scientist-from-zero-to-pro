import { css } from '@emotion/css';
import { memo, useRef, useState, type JSX } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Badge, Button, LinkButton, useStyles2 } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

import { getEditKeeperUrl } from '../constants';
import { useActivateFlow } from '../hooks/useActivateFlow';
import { type KeeperListItem } from '../types';

import { DeleteKeeperModal } from './DeleteKeeperModal';

interface KeeperCardProps {
  keeper: KeeperListItem;
}

const KeeperCardComponent = ({ keeper }: KeeperCardProps): JSX.Element => {
  const styles = useStyles2(getStyles);
  const canEdit = contextSrv.hasPermission(AccessControlAction.SecretKeepersWrite);
  const canDelete = contextSrv.hasPermission(AccessControlAction.SecretKeepersDelete);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // The Activate button unmounts when keeper.isActive flips to true, so the
  // ConfirmModal's focus-to-trigger restoration drops focus to document.body.
  // After successful activation, move focus to the stable View details link
  // on the same card.
  const editButtonRef = useRef<HTMLAnchorElement>(null);
  const activateFlow = useActivateFlow({
    name: keeper.name,
    isActive: keeper.isActive,
    onSuccess: () => editButtonRef.current?.focus(),
  });

  const titleSection = (
    <div className={styles.cardTitle}>
      {keeper.name}
      {keeper.isActive && (
        <Badge
          text={t('secrets-keeper.home.active-badge', 'Active')}
          color="green"
          icon="check"
          className={styles.activeBadge}
        />
      )}
    </div>
  );

  const metaSection = (
    <div className={styles.cardMeta}>
      <span className={styles.type}>{getKeeperTypeLabel(keeper.type)}</span>
      {keeper.config && (
        <>
          <span className={styles.separator}>•</span>
          <span className={styles.config}>{keeper.config}</span>
        </>
      )}
    </div>
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {/* Groups title and metadata for flexbox layout */}
        <div>
          {titleSection}
          {metaSection}
        </div>
        <div className={styles.cardActions}>
          {canEdit && (
            <LinkButton
              ref={editButtonRef}
              href={getEditKeeperUrl(keeper.name)}
              variant="secondary"
              size="sm"
              aria-label={t('secrets-keeper.home.view-details-aria', 'View details for {{name}}', {
                name: keeper.name,
              })}
              data-testid="keeper-edit"
            >
              {t('secrets-keeper.home.view-details', 'View details')}
            </LinkButton>
          )}
          {activateFlow.hasPermission && !keeper.isActive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={activateFlow.onClick}
              aria-label={t('secrets-keeper.home.activate-aria', 'Activate {{name}}', { name: keeper.name })}
              data-testid="keeper-activate"
            >
              {t('secrets-keeper.home.activate', 'Activate')}
            </Button>
          )}
          {canDelete && (
            <Button
              icon="trash-alt"
              variant="destructive"
              fill="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              aria-label={t('secrets-keeper.home.delete-aria', 'Delete {{name}}', { name: keeper.name })}
              data-testid="keeper-delete"
            />
          )}
        </div>
      </div>
      {keeper.description && <div className={styles.cardDescription}>{keeper.description}</div>}

      <DeleteKeeperModal
        keeperName={keeper.name}
        isOpen={isDeleteModalOpen}
        onDismiss={() => setIsDeleteModalOpen(false)}
      />
      {activateFlow.modal}
    </div>
  );
};

const getKeeperTypeLabel = (type: KeeperListItem['type']): string => {
  const labels: Record<KeeperListItem['type'], string> = {
    aws: t('secrets-keeper.type.aws', 'AWS Secrets Manager'),
    system: t('secrets-keeper.type.system', 'System (Grafana)'),
    unknown: t('secrets-keeper.type.unknown', 'Unknown'),
  };
  return labels[type];
};

const getStyles = (theme: GrafanaTheme2) => ({
  card: css({
    padding: theme.spacing(2),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    '&:hover': {
      background: theme.colors.emphasize(theme.colors.background.secondary, 0.03),
      borderColor: theme.colors.border.medium,
    },
  }),
  cardHeader: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1),
  }),
  cardTitle: css({
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
  activeBadge: css({
    marginLeft: theme.spacing(1),
  }),
  cardMeta: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  type: css({
    fontWeight: theme.typography.fontWeightMedium,
  }),
  separator: css({
    color: theme.colors.text.disabled,
  }),
  config: css({
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
  cardActions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
  cardDescription: css({
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing(1),
  }),
});

export const KeeperCard = memo(KeeperCardComponent);
