import { css, cx } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import {
  Divider,
  FilterInput,
  InlineSwitch,
  Label,
  MultiCombobox,
  RadioButtonGroup,
  Stack,
  useStyles2,
} from '@grafana/ui';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { SortPicker } from '../../../core/components/Select/SortPicker';
import { TagFilter, type TermCount } from '../../../core/components/TagFilter/TagFilter';
import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { getQueryLibrarySortingOptions } from '../QueryLibrarySortingOptions';
import { type SavedQueriesFilterState } from '../hooks/useSavedQueriesData';

const SEARCH_ID = 'saved-queries-search';
const AUTHOR_FILTER_ID = 'saved-queries-author-filter';
const DATASOURCE_FILTER_ID = 'saved-queries-datasource-filter';
const TAG_FILTER_ID = 'saved-queries-tag-filter';

type Props = {
  filters: SavedQueriesFilterState;
  setFilters: (update: Partial<SavedQueriesFilterState>) => void;
  availableDatasources: string[];
  availableUsers: Array<NonNullable<SavedQuery['user']>>;
  getTagOptions: () => Promise<TermCount[]>;
  disabled?: boolean;
};

// Left-side filter panel: starred toggle, search, author/datasource/tag filters, sort picker, and a "remember filters" toggle.
export function SavedQueriesFilters({
  filters,
  setFilters,
  availableDatasources,
  availableUsers,
  getTagOptions,
  disabled,
}: Props) {
  const styles = useStyles2(getStyles);
  const { triggerAnalyticsEvent } = useQueryLibraryContext();

  const starredOptions = [
    { value: false, label: t('saved-queries.filters.all-queries', 'All queries') },
    { value: true, label: t('saved-queries.filters.starred', 'Starred queries') },
  ];

  return (
    <div className={styles.filters} role="region" aria-label={t('saved-queries.filters.panel-label', 'Filters')}>
      <fieldset disabled={Boolean(disabled)} className={styles.fieldset}>
        <Stack direction="column" gap={2}>
          {/* Group 1: Starred toggle + Search */}
          <Stack direction="column" gap={1}>
            <Stack direction="column" gap={0}>
              <Label>{t('saved-queries.filters.starred-label', 'Starred queries')}</Label>
              <RadioButtonGroup
                options={starredOptions}
                value={filters.showStarredOnly}
                onChange={(value) => {
                  triggerAnalyticsEvent(QueryLibraryInteractions.starredFilterChanged, { showStarredOnly: value });
                  setFilters({ showStarredOnly: value });
                }}
                aria-label={t('saved-queries.filters.starred-label', 'Starred queries')}
                fullWidth
                disabled={disabled}
              />
            </Stack>
            <Stack direction="column" gap={0}>
              <Label htmlFor={SEARCH_ID}>{t('saved-queries.filters.search-label', 'Search')}</Label>
              <FilterInput
                id={SEARCH_ID}
                value={filters.searchQuery}
                onChange={(value) => setFilters({ searchQuery: value })}
                onFocus={() => triggerAnalyticsEvent(QueryLibraryInteractions.searchBarFocused)}
                placeholder={t('saved-queries.filters.search-placeholder', 'Search by...')}
                disabled={disabled}
                escapeRegex={false}
              />
            </Stack>
          </Stack>

          <Divider spacing={0} />

          {/* Group 2: Author, Datasource, Tags */}
          <Stack direction="column" gap={1}>
            <Stack direction="column" gap={0}>
              <Label htmlFor={AUTHOR_FILTER_ID}>{t('saved-queries.filters.author-label', 'Author')}</Label>
              <div className={cx(styles.controlWrapper, styles.comboboxWrapper)}>
                <MultiCombobox
                  id={AUTHOR_FILTER_ID}
                  options={availableUsers.map((u) => ({ value: u.uid, label: u.displayName || u.uid }))}
                  value={filters.userFilters}
                  onChange={(selected) => {
                    triggerAnalyticsEvent(QueryLibraryInteractions.userFilterChanged);
                    setFilters({ userFilters: selected.map((o) => o.value) });
                  }}
                  placeholder={t('saved-queries.filters.author-placeholder', 'Select author')}
                  disabled={disabled}
                />
              </div>
            </Stack>
            <Stack direction="column" gap={0}>
              <Label htmlFor={DATASOURCE_FILTER_ID}>
                {t('saved-queries.filters.datasource-label', 'Data source name')}
              </Label>
              <div className={cx(styles.controlWrapper, styles.comboboxWrapper)}>
                <MultiCombobox
                  id={DATASOURCE_FILTER_ID}
                  options={availableDatasources.map((ds) => ({ value: ds, label: ds }))}
                  value={filters.datasourceFilters}
                  onChange={(selected) => {
                    triggerAnalyticsEvent(QueryLibraryInteractions.dataSourceFilterChanged);
                    setFilters({ datasourceFilters: selected.map((o) => o.value) });
                  }}
                  placeholder={t('saved-queries.filters.datasource-placeholder', 'Select data source name')}
                  disabled={disabled}
                />
              </div>
            </Stack>
            <Stack direction="column" gap={0}>
              <Label htmlFor={TAG_FILTER_ID}>{t('saved-queries.filters.tags-label', 'Tags')}</Label>
              <TagFilter
                inputId={TAG_FILTER_ID}
                tags={filters.tagFilters}
                onChange={(tags) => {
                  triggerAnalyticsEvent(QueryLibraryInteractions.tagFilterChanged);
                  setFilters({ tagFilters: tags });
                }}
                tagOptions={getTagOptions}
                isClearable={false}
                disabled={disabled}
              />
            </Stack>
          </Stack>

          <Divider spacing={0} />

          {/* Group 3: Sort */}
          <Stack direction="column" gap={0}>
            <Label>{t('saved-queries.filters.sort-label', 'Sort')}</Label>
            <div className={styles.controlWrapper}>
              <SortPicker
                value={filters.sortingOption?.value}
                onChange={(change) => {
                  triggerAnalyticsEvent(QueryLibraryInteractions.sortingOptionChanged, { value: change.value });
                  setFilters({ sortingOption: change });
                }}
                getSortOptions={getQueryLibrarySortingOptions}
                placeholder={t('saved-queries.filters.sort-placeholder', 'Sort')}
                disabled={disabled}
              />
            </div>
          </Stack>

          <Divider spacing={0} />

          {/* Remember filters toggle */}
          <Stack direction="column" gap={0.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Label htmlFor="remember-filters-toggle">
                {t('saved-queries.filters.remember-filters-label', 'Remember filters')}
              </Label>
              <InlineSwitch
                id="remember-filters-toggle"
                transparent={true}
                className={styles.inlineSwitch}
                value={filters.rememberFilters}
                onChange={(e) => {
                  triggerAnalyticsEvent(QueryLibraryInteractions.rememberFiltersToggled, {
                    rememberFilters: e.currentTarget.checked,
                  });
                  setFilters({ rememberFilters: e.currentTarget.checked });
                }}
                aria-describedby="remember-filters-subtext"
                disabled={disabled}
              />
            </Stack>
            <span id="remember-filters-subtext" className={styles.subtext}>
              {t('saved-queries.filters.remember-filters-subtext', 'Your settings restore on next visit')}
            </span>
          </Stack>
        </Stack>
      </fieldset>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  fieldset: css({ border: 'none', padding: 0, margin: 0 }),
  filters: css({
    width: '290px',
    flexShrink: 0,
    padding: theme.spacing(2),
    paddingTop: 0,
    overflowY: 'auto',
    paddingRight: theme.spacing(2),
  }),
  subtext: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
  // The inlineContainer normally has height: theme.components.height.md (~32px).
  // Override it to match the actual toggle height so the subtext sits closer.
  inlineSwitch: css({
    height: theme.spacing(2),
    padding: 0,
  }),
  controlWrapper: css({
    width: '100%',
  }),
  comboboxWrapper: css({
    '& input[disabled]': {
      backgroundColor: 'transparent',
    },
  }),
});
