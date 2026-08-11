import { useCallback } from 'react';

import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';
import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

export interface UseActivateKeeperResult {
  activateKeeper: (name: string) => Promise<void>;
  isLoading: boolean;
}

export const useActivateKeeper = (): UseActivateKeeperResult => {
  const [activateMutation, { isLoading }] = secretAPIv1beta1.useCreateKeeperActivateMutation();

  const activateKeeper = useCallback(
    async (name: string): Promise<void> => {
      // The activate subresource ignores the request body — the keeper name
      // lives in the URL path. The generated mutation type still requires a
      // Keeper-shaped second arg, so cast an empty object to satisfy it.
      await activateMutation({ name, keeper: {} as Keeper }).unwrap();
    },
    [activateMutation]
  );

  return {
    activateKeeper,
    isLoading,
  };
};
