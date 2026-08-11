import { css } from '@emotion/css';
import { useState } from 'react';

import { t } from '@grafana/i18n';
import { ConfirmModal, IconButton, Stack, useStyles2 } from '@grafana/ui';
import { useDeleteQueryMutation } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { canEditQuery, hasWritePermissions } from '../utils/identity';

type Props = {
  query: SavedQuery;
  disabled?: boolean;
  onDelete?: () => void;
};

// Duplicate and Delete icon buttons shown in the details panel footer. Delete triggers a confirmation modal.
// The ConfirmModal is rendered locally (not via ShowConfirmModalEvent) to avoid click-through closing the
// parent SavedQueriesModal when Cancel is clicked.
export function SavedQueryDetailActions({ query, disabled, onDelete }: Props) {
  const styles = useStyles2(getStyles);
  const { onAddHistoryQueryToLibrary, triggerAnalyticsEvent } = useQueryLibraryContext();
  const [deleteQuery, { isLoading: isDeleteLoading }] = useDeleteQueryMutation();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleteConfirmOpen(false);
    await deleteQuery({ name: query.uid! }).unwrap();
    triggerAnalyticsEvent(QueryLibraryInteractions.deleteQueryClicked);
    onDelete?.();
  };

  const onDuplicate = () => {
    triggerAnalyticsEvent(QueryLibraryInteractions.duplicateQueryClicked);
    onAddHistoryQueryToLibrary({
      ...query,
      uid: undefined,
      title: t('saved-queries.details.default-title', 'New query'),
    });
  };

  return (
    <>
      <Stack direction="row" gap={1}>
        <IconButton
          aria-label={t('saved-queries.details.duplicate', 'Duplicate')}
          tooltip={t('saved-queries.details.duplicate', 'Duplicate')}
          name="copy"
          variant="secondary"
          size="md"
          disabled={disabled || !hasWritePermissions()}
          onClick={onDuplicate}
        />
        <IconButton
          aria-label={t('saved-queries.details.delete', 'Delete')}
          tooltip={t('saved-queries.details.delete', 'Delete')}
          name={isDeleteLoading ? 'spinner' : 'trash-alt'}
          size="md"
          disabled={disabled || !canEditQuery(query) || isDeleteLoading}
          onClick={() => setIsDeleteConfirmOpen(true)}
        />
      </Stack>
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={t('saved-queries.details.delete-modal.title', 'Delete query')}
        body={t(
          'saved-queries.details.delete-modal.body-text',
          "You're about to remove this saved query. This action cannot be undone. Do you want to continue?"
        )}
        confirmText={t('saved-queries.details.delete-modal.confirm-button', 'Delete query')}
        modalClass={styles.centeredModal}
        onConfirm={handleDeleteConfirm}
        onDismiss={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
}

const getStyles = () => ({
  centeredModal: css({
    top: '50%',
    transform: 'translateY(-50%)',
  }),
});
