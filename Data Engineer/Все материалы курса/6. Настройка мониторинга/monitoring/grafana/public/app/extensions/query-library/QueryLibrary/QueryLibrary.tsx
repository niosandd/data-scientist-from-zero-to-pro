import { uniqBy } from 'lodash';
import { useEffect, useMemo, useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useAsync } from 'react-use';

import { type SelectableValue } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Box, Divider, EmptyState, Stack } from '@grafana/ui';
import { useListQueryQuery } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';

import { type TermCount } from '../../../core/components/TagFilter/TagFilter';
import { newestSortingOption } from '../QueryLibrarySortingOptions';
import { selectors } from '../e2e-selectors/selectors';
import { useGetSavedQueries } from '../hooks/useGetSavedQueries';
import { QueryLibraryTab } from '../types';
import { useGetNewSavedQuery } from '../utils/dataFetching';
import { getUserStorageFavorites } from '../utils/favorites';
import { fetchQueryHistory } from '../utils/fetchQueryHistory';
import { convertToMapTagCount } from '../utils/mappers';
import { searchQueryLibrary } from '../utils/search';

import { QueryLibraryContent } from './QueryLibraryContent';
import { QueryLibraryFilters } from './QueryLibraryFilters';

export type QueryLibraryFiltersFormType = {
  searchQuery: string;
  datasourceFilters: Array<SelectableValue<string>>;
  userFilters: Array<SelectableValue<string>>;
  sortingOption: SelectableValue;
  tagFilters: string[];
};

export function QueryLibrary() {
  const { userFavorites, setUserFavorites, activeTab, newQuery: query, activeDatasources } = useQueryLibraryContext();

  const filterFormMethods = useForm<QueryLibraryFiltersFormType>({
    defaultValues: {
      searchQuery: '',
      datasourceFilters: activeDatasources.map((ds) => ({ value: ds, label: ds })),
      userFilters: [],
      sortingOption: newestSortingOption(),
      tagFilters: [],
    },
  });

  // DATA FETCHING
  const {
    data: rawData,
    isLoading: isQueryTemplatesLoading,
    error,
  } = useListQueryQuery({}, { refetchOnMountOrArgChange: true });

  useEffect(() => {
    getUserStorageFavorites().then((value) => {
      setUserFavorites((current) => ({ ...value, ...current }));
    });
  }, [setUserFavorites]);

  const { value: savedQueries, loading: isSavedQueriesLoading } = useGetSavedQueries(rawData);
  const {
    data: newQuery,
    isLoading: isNewQueryLoading,
    isError: isNewQueryError,
  } = useGetNewSavedQuery(query?.query, query?.description);

  const { searchQuery, datasourceFilters, userFilters, sortingOption, tagFilters } = filterFormMethods.watch();

  // Filtering right now is done just on the frontend until there is better backend support for this.
  const filteredRows = useMemo(
    () =>
      savedQueries
        ? searchQueryLibrary(
            savedQueries,
            searchQuery,
            datasourceFilters.map((f) => f.value || ''),
            userFilters.map((f) => f.value || ''),
            tagFilters,
            activeTab,
            userFavorites,
            sortingOption?.sort
          )
        : [],
    [savedQueries, searchQuery, datasourceFilters, userFilters, tagFilters, sortingOption, activeTab, userFavorites]
  );

  const queryHistory = useAsync(async () => {
    return await fetchQueryHistory();
  }, []);

  // Adds the new query datasource to the active datasource filters if it's not already.
  useEffect(() => {
    if (
      newQuery?.datasourceName &&
      !datasourceFilters.some((ds) => ds.value === newQuery.datasourceName) &&
      datasourceFilters.length > 0
    ) {
      filterFormMethods.setValue('datasourceFilters', [
        ...datasourceFilters,
        { value: newQuery.datasourceName, label: newQuery.datasourceName },
      ]);
    }
  }, [newQuery, datasourceFilters, filterFormMethods]);

  const isFiltered = Boolean(
    searchQuery || datasourceFilters.length > 0 || userFilters.length > 0 || tagFilters.length > 0
  );

  const isLoading =
    isQueryTemplatesLoading ||
    isSavedQueriesLoading ||
    typeof filteredRows === 'undefined' ||
    (isSavedQueriesLoading && !filteredRows.length);

  const users = uniqBy(
    savedQueries?.map(({ user }) => user),
    'uid'
  );
  const datasourceNames = useMemo(() => {
    return savedQueries ? uniqBy(savedQueries, 'datasourceName').map((row) => row.datasourceName) : [];
  }, [savedQueries]);

  const getTagOptions = useCallback(async (): Promise<TermCount[]> => {
    return convertToMapTagCount({ loading: isSavedQueriesLoading, value: savedQueries });
  }, [savedQueries, isSavedQueriesLoading]);

  let libraryRows = filteredRows;
  let usingHistory = false;
  if (activeTab === QueryLibraryTab.RECENT) {
    libraryRows = queryHistory.value || [];
    usingHistory = true;
  }

  const libraryContent = useMemo(() => {
    if ((isLoading && !newQuery) || isNewQueryLoading) {
      return <QueryLibraryContent.Skeleton skeletonDetails />;
    } else {
      return (
        <QueryLibraryContent
          newQuery={newQuery}
          isFiltered={isFiltered}
          usingHistory={usingHistory}
          queryRows={libraryRows || []}
          isLoading={isLoading}
        />
      );
    }
  }, [libraryRows, isLoading, isFiltered, usingHistory, newQuery, isNewQueryLoading]);

  if (error || isNewQueryError) {
    return (
      <EmptyState variant="not-found" message={t('query-library.error-state.title', 'Something went wrong!')}>
        {error instanceof Error ? error.message : ''}
      </EmptyState>
    );
  }

  const showFilters = activeTab !== QueryLibraryTab.RECENT;

  return (
    <Stack data-testid={selectors.components.queryLibraryDrawer.content} height="100%" direction="column" gap={0}>
      {showFilters && (
        <Box backgroundColor="primary" paddingBottom={2}>
          <FormProvider {...filterFormMethods}>
            <QueryLibraryFilters
              datasourceFilterOptions={datasourceNames.map((r) => ({
                value: r,
                label: r,
              }))}
              disabled={isLoading || !!newQuery}
              userFilterOptions={users?.map((user) => ({
                value: user?.uid,
                label: user?.displayName,
              }))}
              getTagOptions={getTagOptions}
            />
          </FormProvider>
        </Box>
      )}
      {showFilters && <Divider spacing={0} />}
      <Stack direction="column" flex={1} minHeight={0}>
        {libraryContent}
      </Stack>
    </Stack>
  );
}
