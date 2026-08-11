import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';
import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { type KeeperFormValues } from '../types';
import { formValuesToKeeper } from '../utils';

export interface UseCreateKeeperResult {
  createKeeper: (values: KeeperFormValues) => Promise<Keeper>;
  isLoading: boolean;
}

export const useCreateKeeper = (): UseCreateKeeperResult => {
  const [createMutation, { isLoading }] = secretAPIv1beta1.useCreateKeeperMutation();

  const createKeeper = async (values: KeeperFormValues): Promise<Keeper> => {
    const keeper = formValuesToKeeper(values);
    return createMutation({ keeper }).unwrap();
  };

  return {
    createKeeper,
    isLoading,
  };
};
