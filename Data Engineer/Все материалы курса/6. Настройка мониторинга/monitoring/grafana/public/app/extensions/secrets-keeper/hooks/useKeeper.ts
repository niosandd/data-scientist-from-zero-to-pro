import { generatedAPI as secretAPIv1beta1 } from 'app/extensions/api/clients/secret/v1beta1';
import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

export interface UseKeeperResult {
  keeper: Keeper | undefined;
  isLoading: boolean;
  error: unknown;
}

export const useKeeper = (name: string): UseKeeperResult => {
  const { data, isLoading, error } = secretAPIv1beta1.useGetKeeperQuery({ name });

  return {
    keeper: data,
    isLoading,
    error,
  };
};
