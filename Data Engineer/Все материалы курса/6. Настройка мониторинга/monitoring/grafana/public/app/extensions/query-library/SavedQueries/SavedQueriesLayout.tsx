import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Divider, EmptyState, useStyles2 } from '@grafana/ui';

import { useQueryLibraryContext } from '../../../features/explore/QueryLibrary/QueryLibraryContext';
import { useSavedQueriesData } from '../hooks/useSavedQueriesData';

import { SavedQueriesFilters } from './SavedQueriesFilters';
import { SavedQueriesLibrary } from './SavedQueriesLibrary';

// Modal body: renders the filter panel and query library side by side, or an error state if data loading fails.
export function SavedQueriesLayout() {
  const styles = useStyles2(getStyles);
  const { isEditingQuery } = useQueryLibraryContext();
  const {
    queryRows,
    newQuery,
    isLoading,
    isNewQueryError,
    error,
    availableDatasources,
    availableUsers,
    getTagOptions,
    filters,
    setFilters,
  } = useSavedQueriesData();

  if (error || isNewQueryError) {
    return (
      <EmptyState variant="not-found" message={t('saved-queries.error-state.title', 'Something went wrong!')}>
        {error instanceof Error ? error.message : ''}
      </EmptyState>
    );
  }

  return (
    <div className={styles.layout}>
      <SavedQueriesFilters
        filters={filters}
        setFilters={setFilters}
        availableDatasources={availableDatasources}
        availableUsers={availableUsers}
        getTagOptions={getTagOptions}
        disabled={isLoading || !!newQuery || isEditingQuery}
      />
      <Divider direction="vertical" spacing={0} />
      <SavedQueriesLibrary queryRows={queryRows} newQuery={newQuery} isLoading={isLoading} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  layout: css({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    paddingTop: theme.spacing(2),
  }),
});
