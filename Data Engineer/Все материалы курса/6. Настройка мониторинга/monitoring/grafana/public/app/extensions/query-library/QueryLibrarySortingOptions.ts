import { type SelectableValue } from '@grafana/data';
import { t } from '@grafana/i18n';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

export const newestSortingOption = () => ({
  value: 'newest',
  label: t('query-library.filters.sort.newest', 'Newest first'),
  sort: (a: SavedQuery, b: SavedQuery) => {
    const aCreatedAt = a.createdAtTimestamp ?? 0;
    const bCreatedAt = b.createdAtTimestamp ?? 0;
    return bCreatedAt - aCreatedAt;
  },
});

const oldestSortingOption = () => ({
  value: 'oldest',
  label: t('query-library.filters.sort.oldest', 'Oldest first'),
  sort: (a: SavedQuery, b: SavedQuery) => {
    const aCreatedAt = a.createdAtTimestamp ?? 0;
    const bCreatedAt = b.createdAtTimestamp ?? 0;
    return aCreatedAt - bCreatedAt;
  },
});

const alphabeticallySortingOption = () => ({
  value: 'asc',
  label: t('query-library.filters.sort.asc', 'Alphabetically (A–Z)'),
  sort: (a: SavedQuery, b: SavedQuery) => {
    const aTitle = a.title ?? '';
    const bTitle = b.title ?? '';
    return aTitle.localeCompare(bTitle);
  },
});

const alphabeticallyReverseSortingOption = () => ({
  value: 'desc',
  label: t('query-library.filters.sort.desc', 'Alphabetically (Z–A)'),
  sort: (a: SavedQuery, b: SavedQuery) => {
    const aTitle = a.title ?? '';
    const bTitle = b.title ?? '';
    return bTitle.localeCompare(aTitle);
  },
});

export const getQueryLibrarySortingOptions = (): Promise<SelectableValue[]> => {
  return Promise.resolve([
    newestSortingOption(),
    oldestSortingOption(),
    alphabeticallySortingOption(),
    alphabeticallyReverseSortingOption(),
  ]);
};
