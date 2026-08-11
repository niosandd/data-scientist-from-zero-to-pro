import { type JSX, useState } from 'react';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

import { ActivateKeeperModal } from '../components/ActivateKeeperModal';

export interface UseActivateFlowArgs {
  name: string;
  isActive: boolean;
  // Fires after a successful activate/deactivate. Use to move focus to a
  // stable element when the trigger button is about to unmount (e.g., the
  // Activate button vanishes once the keeper goes active).
  onSuccess?: () => void;
}

export interface UseActivateFlowResult {
  // True when the user has the RBAC permission to activate/deactivate keepers.
  // Callers should hide the button entirely if this is false.
  hasPermission: boolean;
  onClick: () => void;
  // Rendered by the caller inside its own tree (the modal lives beside the button).
  modal: JSX.Element;
}

export const useActivateFlow = ({ name, isActive, onSuccess }: UseActivateFlowArgs): UseActivateFlowResult => {
  const hasPermission = contextSrv.hasPermission(AccessControlAction.SecretKeepersWrite);
  const [isOpen, setIsOpen] = useState(false);

  const mode = isActive ? 'deactivate' : 'activate';

  const onClick = () => {
    if (!hasPermission) {
      return;
    }
    setIsOpen(true);
  };

  const modal = (
    <ActivateKeeperModal
      mode={mode}
      keeperName={name}
      isOpen={isOpen}
      onDismiss={() => setIsOpen(false)}
      onSuccess={onSuccess}
    />
  );

  return {
    hasPermission,
    onClick,
    modal,
  };
};
