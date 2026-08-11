import { useState } from 'react';

import { AppEvents } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents } from '@grafana/runtime';
import { Alert, ConfirmModal } from '@grafana/ui';
import { extractErrorMessage } from 'app/api/utils';

import { useDeleteKeeper } from '../hooks/useDeleteKeeper';

interface DeleteKeeperModalProps {
  keeperName: string;
  isOpen: boolean;
  onDismiss: () => void;
}

export function DeleteKeeperModal({ keeperName, isOpen, onDismiss }: DeleteKeeperModalProps) {
  const { deleteKeeper, isLoading } = useDeleteKeeper();
  const [error, setError] = useState<string | undefined>();

  const handleDismiss = () => {
    setError(undefined);
    onDismiss();
  };

  const handleConfirm = async () => {
    setError(undefined);
    try {
      await deleteKeeper(keeperName);
      getAppEvents().publish({
        type: AppEvents.alertSuccess.name,
        payload: [t('secrets-keeper.home.delete-success', 'Keeper "{{name}}" was deleted', { name: keeperName })],
      });
      onDismiss();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onDismiss={handleDismiss}
      onConfirm={handleConfirm}
      disabled={isLoading}
      confirmText={t('secrets-keeper.home.delete-modal.confirm-button', 'Delete')}
      confirmationText={t('secrets-keeper.home.delete-modal.confirm-text', 'Delete')}
      dismissText={t('secrets-keeper.home.delete-modal.dismiss-button', 'Cancel')}
      title={t('secrets-keeper.home.delete-modal.title', 'Delete keeper')}
      body={
        <>
          {error && (
            <Alert severity="error" title={t('secrets-keeper.home.delete-error', 'Failed to delete keeper')}>
              {error}
            </Alert>
          )}
          {t('secrets-keeper.home.delete-modal.body', 'Are you sure you want to delete the following keeper?')}
          <div>
            <code>{keeperName}</code>
          </div>
        </>
      }
      description={t(
        'secrets-keeper.home.delete-modal.description',
        'Deleting a keeper is irreversible. Any secrets stored in this keeper will need to be migrated before deletion.'
      )}
    />
  );
}
