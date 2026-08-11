import { UserStorage } from '@grafana/runtime/internal';

const userStorage = new UserStorage('saved-queries');

// 'saved' keeps the original, un-suffixed key so existing users' remembered filters aren't
// reset (and the old key isn't orphaned) when this ships. New namespaces get a suffixed key.
const getFilterDefaultsKey = (namespace: string) =>
  namespace === 'saved' ? 'filter-defaults' : `filter-defaults-${namespace}`;

export const getStoredFilterDefaults = async <T>(namespace: string): Promise<Partial<T>> => {
  const value = await userStorage.getItem(getFilterDefaultsKey(namespace));
  return value ? JSON.parse(value) : {};
};

export const storeFilterDefaults = async <T>(namespace: string, filters: T): Promise<void> => {
  await userStorage.setItem(getFilterDefaultsKey(namespace), JSON.stringify(filters));
};
