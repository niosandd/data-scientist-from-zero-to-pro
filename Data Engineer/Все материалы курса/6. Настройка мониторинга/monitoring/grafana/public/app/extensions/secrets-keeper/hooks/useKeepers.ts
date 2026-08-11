import { useMemo } from 'react';

import { extractErrorMessage } from 'app/api/utils';
import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';

import { type KeeperListItem } from '../types';
import { keeperToListItem } from '../utils';

export interface UseKeepersResult {
  keepers: KeeperListItem[];
  isLoading: boolean;
  error: Error | undefined;
  activeKeeper: KeeperListItem | undefined;
}

export const useKeepers = (): UseKeepersResult => {
  const { data, isLoading, error } = secretAPIv1beta1.useListKeeperQuery({});

  const { keepers, activeKeeper } = useMemo(() => {
    if (!data?.items) {
      return { keepers: [], activeKeeper: undefined };
    }

    // Lift active keepers out, sort the rest alphabetically, then put the
    // active one(s) back at the top so they're immediately visible. We keep
    // *all* active keepers in the list (not just the first) so a BE
    // inconsistency that reports two active is still fully manageable in the
    // UI.
    const items = data.items.map(keeperToListItem);
    const actives = items.filter((k) => k.isActive);
    const others = items.filter((k) => !k.isActive).sort((a, b) => a.name.localeCompare(b.name));
    const keepers = [...actives, ...others];

    return { keepers, activeKeeper: actives[0] };
  }, [data]);

  return {
    keepers,
    isLoading,
    error: error ? new Error(extractErrorMessage(error)) : undefined,
    activeKeeper,
  };
};
