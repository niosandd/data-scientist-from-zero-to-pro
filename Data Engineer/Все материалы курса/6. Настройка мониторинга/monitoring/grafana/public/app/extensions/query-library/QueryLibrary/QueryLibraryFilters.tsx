import { Controller, useFormContext } from 'react-hook-form';

import { type SelectableValue } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Box, FilterInput, MultiSelect, Stack } from '@grafana/ui';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';

import { SortPicker } from '../../../core/components/Select/SortPicker';
import { TagFilter, type TermCount } from '../../../core/components/TagFilter/TagFilter';
import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { getQueryLibrarySortingOptions } from '../QueryLibrarySortingOptions';
import { selectors } from '../e2e-selectors/selectors';

import { type QueryLibraryFiltersFormType } from './QueryLibrary';

export interface QueryLibraryFiltersProps {
  datasourceFilterOptions: Array<SelectableValue<string>>;
  disabled?: boolean;
  userFilterOptions: Array<SelectableValue<string>>;
  getTagOptions: () => Promise<TermCount[]>;
}

const DATASOURCE_FILTER_ID = 'query-library-datasource-filter';
const USER_FILTER_ID = 'query-library-user-filter';
const TAG_FILTER_ID = 'query-library-tag-filter';

const MIN_FILTER_WIDTH = 30;

export function QueryLibraryFilters({
  datasourceFilterOptions,
  disabled,
  userFilterOptions,
  getTagOptions,
}: QueryLibraryFiltersProps) {
  const { triggerAnalyticsEvent } = useQueryLibraryContext();

  const { control } = useFormContext<QueryLibraryFiltersFormType>();

  return (
    <Stack direction="column">
      <Stack direction="row">
        <Controller
          name="searchQuery"
          control={control}
          render={({ field }) => (
            <FilterInput
              {...field}
              disabled={disabled}
              placeholder={t(
                'query-library.filters.search-placeholder',
                'Search by data source, query content, title, or description'
              )}
              aria-label={t(
                'query-library.filters.search-placeholder',
                'Search by data source, query content, title, or description'
              )}
              onFocus={() => triggerAnalyticsEvent(QueryLibraryInteractions.searchBarFocused)}
              escapeRegex={false}
              data-testid={selectors.components.queryLibraryDrawer.searchInput}
            />
          )}
        />

        <Box flex={1}>
          <Controller
            name="sortingOption"
            control={control}
            render={({ field }) => (
              <SortPicker
                value={field.value?.value}
                onChange={(change) => {
                  field.onChange(change);
                  triggerAnalyticsEvent(QueryLibraryInteractions.sortingOptionChanged, { value: change.value });
                }}
                getSortOptions={getQueryLibrarySortingOptions}
                placeholder={t('query-library.filters.sort-placeholder', 'Sort')}
                disabled={disabled}
                width={28}
              />
            )}
          />
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} wrap="wrap">
        <Box flex={1} minWidth={MIN_FILTER_WIDTH}>
          <Controller
            name="datasourceFilters"
            control={control}
            render={({ field }) => (
              // TSGO / TS7 is much stricter with generics. Whilst we're between TS versions, we need to explicitly define the generic type here to avoid errors.
              <MultiSelect<string>
                value={field.value}
                onChange={(items) => {
                  field.onChange(items);
                  triggerAnalyticsEvent(QueryLibraryInteractions.dataSourceFilterChanged);
                }}
                inputId={DATASOURCE_FILTER_ID}
                options={datasourceFilterOptions}
                placeholder={t('query-library.filters.datasource-placeholder', 'Filter by data source')}
                aria-label={t('query-library.filters.datasource-placeholder', 'Filter by data source')}
                disabled={disabled}
                data-testid={selectors.components.queryLibraryDrawer.datasourceInput}
              />
            )}
          />
        </Box>
        <Box flex={1} minWidth={MIN_FILTER_WIDTH}>
          <Controller
            name="userFilters"
            control={control}
            render={({ field }) => (
              // TSGO / TS7 is much stricter with generics. Whilst we're between TS versions, we need to explicitly define the generic type here to avoid errors.
              <MultiSelect<string>
                value={field.value}
                onChange={(items) => {
                  field.onChange(items);
                  triggerAnalyticsEvent(QueryLibraryInteractions.userFilterChanged);
                }}
                inputId={USER_FILTER_ID}
                options={userFilterOptions}
                placeholder={t('query-library.filters.datasource-user', 'Filter by user name')}
                aria-label={t('query-library.filters.datasource-user', 'Filter by user name')}
                disabled={disabled}
                data-testid={selectors.components.queryLibraryDrawer.usernameInput}
              />
            )}
          />
        </Box>
        <Box flex={1} minWidth={MIN_FILTER_WIDTH}>
          <Controller
            name="tagFilters"
            control={control}
            render={({ field }) => (
              <TagFilter
                tags={field.value}
                onChange={(tags) => {
                  field.onChange(tags);
                  triggerAnalyticsEvent(QueryLibraryInteractions.tagFilterChanged);
                }}
                isClearable={false}
                tagOptions={getTagOptions}
                inputId={TAG_FILTER_ID}
                disabled={disabled}
                data-testid={selectors.components.queryLibraryDrawer.tagsInput}
              />
            )}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
