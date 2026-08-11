import { useState } from 'react';

import { AppEvents } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents } from '@grafana/runtime';
import { Alert, ConfirmModal } from '@grafana/ui';
import { extractErrorMessage } from 'app/api/utils';

import { SYSTEM_KEEPER_NAME } from '../constants';
import { useActivateKeeper } from '../hooks/useActivateKeeper';

type ActivateKeeperModalMode = 'activate' | 'deactivate';

interface ActivateKeeperModalProps {
  mode: ActivateKeeperModalMode;
  // For activate: the keeper being activated. For deactivate: the currently
  // active keeper (display only; the underlying call targets SYSTEM_KEEPER_NAME).
  keeperName: string;
  isOpen: boolean;
  onDismiss: () => void;
  // Fires after a successful confirm. Used by callers whose trigger element
  // unmounts on success (e.g., the Activate button on a card) to move focus
  // to a stable target.
  onSuccess?: () => void;
}

export function ActivateKeeperModal({ mode, keeperName, isOpen, onDismiss, onSuccess }: ActivateKeeperModalProps) {
  const { activateKeeper, isLoading } = useActivateKeeper();
  const [error, setError] = useState<string | undefined>();

  const handleDismiss = () => {
    setError(undefined);
    onDismiss();
  };

  const handleConfirm = async () => {
    setError(undefined);
    try {
      const target = mode === 'deactivate' ? SYSTEM_KEEPER_NAME : keeperName;
      await activateKeeper(target);
      getAppEvents().publish({
        type: AppEvents.alertSuccess.name,
        payload: [
          mode === 'deactivate'
            ? t('secrets-keeper.home.deactivate-modal.success', 'Reverted to the system keeper')
            : t('secrets-keeper.home.activate-modal.success', 'Keeper "{{name}}" is now active', {
                name: keeperName,
              }),
        ],
      });
      onDismiss();
      // Defer to the next task so ConfirmModal's synchronous focus-restore
      // (which targets the now-vanishing trigger element) completes before
      // we move focus to the caller's stable target. Avoids a double focus
      // event that some screen readers announce twice.
      if (onSuccess) {
        setTimeout(onSuccess, 0);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const title =
    mode === 'deactivate'
      ? t('secrets-keeper.home.deactivate-modal.title', 'Revert to system keeper')
      : t('secrets-keeper.home.activate-modal.title', 'Activate keeper');

  const confirmText =
    mode === 'deactivate'
      ? t('secrets-keeper.home.deactivate-modal.confirm-button', 'Revert to System Keeper')
      : t('secrets-keeper.home.activate-modal.confirm-button', 'Activate');

  const errorTitle =
    mode === 'deactivate'
      ? t('secrets-keeper.home.deactivate-modal.error-title', 'Failed to revert to system keeper')
      : t('secrets-keeper.home.activate-modal.error-title', 'Failed to activate keeper');

  const bodyIntro =
    mode === 'deactivate'
      ? t(
          'secrets-keeper.home.deactivate-modal.body',
          'Revert to the system keeper and stop using the currently active external keeper?'
        )
      : t('secrets-keeper.home.activate-modal.body', 'Activate the following keeper?');

  const description =
    mode === 'deactivate'
      ? t(
          'secrets-keeper.home.deactivate-modal.description',
          "New secrets will be stored by Grafana's built-in system keeper. Existing secrets remain in their current storage locations."
        )
      : t(
          'secrets-keeper.home.activate-modal.description',
          'All new secrets will be routed through this keeper. Existing secrets remain in their current storage locations.'
        );

  return (
    <ConfirmModal
      isOpen={isOpen}
      onDismiss={handleDismiss}
      onConfirm={handleConfirm}
      disabled={isLoading}
      confirmText={confirmText}
      confirmVariant={mode === 'deactivate' ? 'destructive' : 'primary'}
      dismissText={t('secrets-keeper.home.modal.dismiss-button', 'Cancel')}
      title={title}
      body={
        <>
          {error && (
            <Alert severity="error" title={errorTitle}>
              {error}
            </Alert>
          )}
          {bodyIntro}
          <div>
            <code>{keeperName}</code>
          </div>
        </>
      }
      description={description}
    />
  );
}
