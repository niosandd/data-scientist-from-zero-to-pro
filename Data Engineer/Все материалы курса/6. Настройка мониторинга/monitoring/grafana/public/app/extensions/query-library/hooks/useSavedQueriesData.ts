import { uniqBy } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync } from 'react-use';

import { type SelectableValue } from '@grafana/data';
import { contextSrv } from 'app/core/services/context_srv';
import { useListQueryQuery } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { type TermCount } from '../../../core/components/TagFilter/TagFilter';
import { newestSortingOption } from '../QueryLibrarySortingOptions';
import { useGetNewSavedQuery } from '../utils/dataFetching';
import { getUserStorageFavorites } from '../utils/favorites';
import { getStoredFilterDefaults, storeFilterDefaults } from '../utils/filterDefaults';
import { convertToMapTagCount } from '../utils/mappers';
import { searchQueryLibrary } from '../utils/search';

import { useGetSavedQueries } from './useGetSavedQueries';

export type SavedQueriesFilterState = {
  showStarredOnly: boolean;
  searchQuery: string;
  datasourceFilters: string[];
  userFilters: string[];
  tagFilters: string[];
  sortingOption: SelectableValue;
  rememberFilters: boolean;
};

export type UseSavedQueriesDataReturn = {
  queryRows: SavedQuery[];
  newQuery: SavedQuery | undefined;
  isLoading: boolean;
  isNewQueryError: boolean;
  error: unknown;
  isUsingHistory: boolean;
  availableDatasources: string[];
  availableUsers: Array<NonNullable<SavedQuery['user']>>;
  getTagOptions: () => Promise<TermCount[]>;
  filters: SavedQueriesFilterState;
  setFilters: (update: Partial<SavedQueriesFilterState>) => void;
};

// Fetches saved queries, derives filter options (datasources, users, tags), and applies all active
// filters (search, datasource, user, tag, sort, starred) to return the filtered query rows.
export function useSavedQueriesData(): UseSavedQueriesDataReturn {
  const {
    activeTab,
    newQuery: contextQuery,
    activeDatasources,
    userFavorites,
    setUserFavorites,
  } = useQueryLibraryContext();

  // Seed favorites from UserStorage on mount, merging with any already-set context values.
  useEffect(() => {
    getUserStorageFavorites().then((stored) => {
      setUserFavorites((current) => ({ ...stored, ...current }));
    });
  }, [setUserFavorites]);

  const [filters, setFiltersState] = useState<SavedQueriesFilterState>({
    showStarredOnly: false,
    searchQuery: '',
    datasourceFilters: activeDatasources,
    userFilters: [],
    tagFilters: [],
    sortingOption: newestSortingOption(),
    rememberFilters: false,
  });

  const setFilters = useCallback((update: Partial<SavedQueriesFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const { value: storedFilterDefaults } = useAsync(() => getStoredFilterDefaults<SavedQueriesFilterState>('saved'), []);

  // Only restore stored filters when the user had "Remember filters" turned on.
  useEffect(() => {
    if (storedFilterDefaults?.rememberFilters === true) {
      setFiltersState((prev) => ({ ...prev, ...storedFilterDefaults }));
    }
  }, [storedFilterDefaults]);

  // Always keep a ref to the latest filters so the unmount cleanup can read them.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  // Save filters when the modal closes (this component unmounts) if rememberFilters is on.
  // Using a ref avoids stale-closure issues without adding filters to the effect deps.
  useEffect(() => {
    return () => {
      if (filtersRef.current.rememberFilters) {
        storeFilterDefaults('saved', filtersRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When rememberFilters is turned off, immediately clear any previously stored defaults.
  const prevRememberFiltersRef = useRef(false);
  useEffect(() => {
    if (!filters.rememberFilters && prevRememberFiltersRef.current) {
      storeFilterDefaults('saved', {});
    }
    prevRememberFiltersRef.current = filters.rememberFilters;
  }, [filters.rememberFilters]);

  // refetchOnMountOrArgChange ensures the list is always fresh when the modal reopens
  const { data: rawData, error } = useListQueryQuery({}, { refetchOnMountOrArgChange: true });
  const { value: savedQueries, loading: isSavedQueriesLoading } = useGetSavedQueries(rawData);

  // Enrich the pending query (if any) with datasource metadata. contextQuery is a SavedQuery
  // wrapper; we pass .query (the underlying DataQuery) so the hook can resolve the datasource.
  const {
    data: newQuery,
    isLoading: isNewQueryLoading,
    isError: isNewQueryError,
  } = useGetNewSavedQuery(contextQuery?.query, contextQuery?.description);

  // Apply search, datasource, user, tag, sort, and starred filters to saved queries
  const filteredSavedQueries = useMemo(() => {
    if (!savedQueries) {
      return [];
    }
    const results = searchQueryLibrary(
      savedQueries,
      filters.searchQuery,
      filters.datasourceFilters,
      filters.userFilters,
      filters.tagFilters,
      activeTab,
      userFavorites,
      filters.sortingOption?.sort
    );
    return filters.showStarredOnly ? results.filter((q) => userFavorites[q.uid ?? '']) : results;
  }, [savedQueries, filters, activeTab, userFavorites]);

  // Unique datasource names across all saved queries, used to populate the datasource filter dropdown.
  // The type predicate filter narrows string | undefined → string for type safety.
  const availableDatasources = useMemo(
    () =>
      (savedQueries ? uniqBy(savedQueries, 'datasourceName').map((row) => row.datasourceName) : []).filter(
        (ds): ds is string => ds !== undefined
      ),
    [savedQueries]
  );

  const availableUsers = useMemo(() => {
    if (!savedQueries) {
      return [];
    }
    const users = uniqBy(
      savedQueries.map(({ user }) => user),
      'uid'
    ).filter((u): u is NonNullable<SavedQuery['user']> => u != null);

    // Current user's uid in SavedQuery is prefixed with "user:", e.g. "user:123"
    const currentUserUid = `user:${contextSrv.user.uid}`;
    return users.sort((a, b) => {
      if (a.uid === currentUserUid) {
        return -1;
      }
      if (b.uid === currentUserUid) {
        return 1;
      }
      return 0;
    });
  }, [savedQueries]);

  const getTagOptions = useCallback(
    async (): Promise<TermCount[]> => convertToMapTagCount({ loading: isSavedQueriesLoading, value: savedQueries }),
    [savedQueries, isSavedQueriesLoading]
  );

  // TODO: Re-introduce when the Recent tab is added (will check activeTab === QueryLibraryTab.RECENT)
  const isUsingHistory = false;
  const queryRows = filteredSavedQueries;
  // Derive loading from the end of the async chain rather than OR-ing intermediate flags.
  // savedQueries stays undefined throughout the full pipeline (API fetch → user enrichment → metadata),
  // so this never flickers false between steps.
  const isLoading = savedQueries === undefined || isNewQueryLoading;

  return {
    queryRows,
    newQuery,
    isLoading,
    isNewQueryError,
    error,
    isUsingHistory,
    availableDatasources,
    availableUsers,
    getTagOptions,
    filters,
    setFilters,
  };
}
