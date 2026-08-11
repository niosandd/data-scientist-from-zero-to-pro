import { useCallback } from 'react';

import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';

export interface UseDeleteKeeperResult {
  deleteKeeper: (name: string) => Promise<void>;
  isLoading: boolean;
}

export const useDeleteKeeper = (): UseDeleteKeeperResult => {
  const [deleteMutation, { isLoading }] = secretAPIv1beta1.useDeleteKeeperMutation();

  const deleteKeeper = useCallback(
    async (name: string): Promise<void> => {
      await deleteMutation({ name }).unwrap();
    },
    [deleteMutation]
  );

  return {
    deleteKeeper,
    isLoading,
  };
};
