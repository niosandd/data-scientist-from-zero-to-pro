import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';
import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { type KeeperFormValues } from '../types';
import { formValuesToKeeper } from '../utils';

export interface UseReplaceKeeperResult {
  replaceKeeper: (values: KeeperFormValues, name: string, resourceVersion: string) => Promise<Keeper>;
  isLoading: boolean;
}

export const useReplaceKeeper = (): UseReplaceKeeperResult => {
  const [replaceMutation, { isLoading }] = secretAPIv1beta1.useReplaceKeeperMutation();

  const replaceKeeper = async (values: KeeperFormValues, name: string, resourceVersion: string): Promise<Keeper> => {
    const keeper = formValuesToKeeper(values);
    keeper.metadata.name = name;
    keeper.metadata.resourceVersion = resourceVersion;
    return replaceMutation({ name, keeper }).unwrap();
  };

  return {
    replaceKeeper,
    isLoading,
  };
};
