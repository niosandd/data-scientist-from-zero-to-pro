import { t } from '@grafana/i18n';
import { getAppEvents } from '@grafana/runtime';
import { IconButton, Stack } from '@grafana/ui';
import { notifyApp } from 'app/core/reducers/appNotification';
import { useDeleteQueryMutation, useUpdateQueryMutation } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { createSuccessNotification } from '../../../core/copy/appNotification';
import { dispatch } from '../../../store/store';
import { ShowConfirmModalEvent } from '../../../types/events';
import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { selectors } from '../e2e-selectors/selectors';
import { canEditQuery, hasWritePermissions } from '../utils/identity';

export interface QueryLibraryMenuActionsProps {
  selectedQueryRow: SavedQuery;
  onEditQuerySuccess: (uid: string, isNew?: boolean) => void;
}

export function QueryLibraryMenuActions({ selectedQueryRow, onEditQuerySuccess }: QueryLibraryMenuActionsProps) {
  const { onAddHistoryQueryToLibrary } = useQueryLibraryContext();

  const [deleteQueryTemplate] = useDeleteQueryMutation();
  const [editQueryTemplate, { isLoading }] = useUpdateQueryMutation();
  const { triggerAnalyticsEvent } = useQueryLibraryContext();

  const { isLocked } = selectedQueryRow;

  const onDeleteQuery = (queryUid: string) => {
    const performDelete = async (queryUid: string) => {
      await deleteQueryTemplate({
        name: queryUid,
      }).unwrap();
      dispatch(notifyApp(createSuccessNotification(t('query-library.notifications.query-deleted', 'Query deleted'))));
      triggerAnalyticsEvent(QueryLibraryInteractions.deleteQueryClicked);
    };

    getAppEvents().publish(
      new ShowConfirmModalEvent({
        title: t('query-library.delete-modal.title', 'Delete query'),
        text: t(
          'query-library.delete-modal.body-text',
          "You're about to remove this saved query. This action cannot be undone. Do you want to continue?"
        ),
        yesText: t('query-library.delete-modal.confirm-button', 'Delete query'),
        onConfirm: () => performDelete(queryUid),
      })
    );
  };

  const onLockToggle = async () => {
    if (!selectedQueryRow.uid) {
      return;
    }
    triggerAnalyticsEvent(QueryLibraryInteractions.lockQueryClicked, {
      isLocked: !isLocked,
    });
    await editQueryTemplate({
      name: selectedQueryRow.uid || '',
      patch: {
        spec: {
          isLocked: !isLocked,
        },
      },
    }).unwrap();

    onEditQuerySuccess(selectedQueryRow.uid);
  };

  const isDisabled = !canEditQuery(selectedQueryRow) || !selectedQueryRow.uid || isLoading;

  return (
    <Stack grow={1}>
      <IconButton
        data-testid={selectors.components.queryLibraryDrawer.duplicate}
        tooltip={t('query-library.actions.duplicate-query-button', 'Duplicate query')}
        disabled={!hasWritePermissions()}
        name="copy"
        variant="secondary"
        onClick={() =>
          onAddHistoryQueryToLibrary({
            ...selectedQueryRow,
            uid: undefined,
            title: t('explore.query-library.default-title', 'New query'),
          })
        }
        size="xl"
      />
      <IconButton
        data-testid={selectors.components.queryLibraryDrawer.lock}
        tooltip={
          isLocked
            ? t('query-library.actions.unlock-query-button', 'Unlock query')
            : t('query-library.actions.lock-query-button', 'Lock query')
        }
        name={isLocked ? 'unlock' : 'lock'}
        disabled={isDisabled}
        onClick={onLockToggle}
        size="xl"
      />
      <IconButton
        tooltip={t('query-library.actions.delete-query-button', 'Delete query')}
        name="trash-alt"
        onClick={() => onDeleteQuery(selectedQueryRow.uid ?? '')}
        data-testid={selectors.components.queryLibraryDrawer.delete}
        disabled={isDisabled || isLocked}
        size="xl"
      />
    </Stack>
  );
}
