import { css, cx } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { IconButton, Stack, Text, useStyles2, Badge } from '@grafana/ui';
import { attachSkeleton, type SkeletonComponent } from '@grafana/ui/unstable';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';
import icnDatasourceSvg from 'img/icn-datasource.svg';

import { selectors } from '../e2e-selectors/selectors';
import { useDatasource } from '../utils/useDatasource';

export interface QueryListItemProps {
  isSelected?: boolean;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onUnfavorite?: () => void;
  isHighlighted?: boolean;
  onSelectQueryRow: (query: SavedQuery) => void;
  queryRow: SavedQuery;
  favoritesEnabled?: boolean;
  usingHistory?: boolean;
  isNew?: boolean;
  disabled?: boolean;
}

const RADIO_GROUP_NAME = 'query-library-list';

function QueryLibraryItemComponent({
  isSelected,
  isHighlighted,
  isFavorite,
  onFavorite,
  onUnfavorite,
  onSelectQueryRow,
  queryRow,
  favoritesEnabled,
  usingHistory,
  isNew,
  disabled,
}: QueryListItemProps) {
  const { value: datasourceApi } = useDatasource(queryRow.datasourceRef);
  const styles = useStyles2(getStyles);

  const { onAddHistoryQueryToLibrary } = useQueryLibraryContext();

  return (
    <label
      data-testid={selectors.components.queryLibraryDrawer.item(queryRow.title ?? '')}
      data-query-uid={queryRow.uid}
      className={cx(
        styles.label,
        (isSelected || isFavorite) && styles.displayFavoriteButton,
        isHighlighted && styles.highlighted,
        disabled && styles.disabled
      )}
      htmlFor={queryRow.uid}
    >
      <input
        // only the selected item should be tabbable
        // arrow keys should navigate between items
        tabIndex={isSelected ? 0 : -1}
        type="radio"
        id={queryRow.uid}
        name={RADIO_GROUP_NAME}
        className={styles.input}
        onChange={() => onSelectQueryRow(queryRow)}
        checked={isSelected}
        disabled={disabled}
      />
      <Stack alignItems="center" justifyContent="space-between">
        <Stack minWidth={0}>
          <img
            className={styles.logo}
            src={datasourceApi?.meta.info.logos.small || icnDatasourceSvg}
            alt={datasourceApi?.type}
          />
          <Text truncate>{queryRow.title ?? ''}</Text>
        </Stack>
        {!isNew && favoritesEnabled && (
          <IconButton
            id={`favorite-${queryRow.uid}`}
            className={'favoriteButton'}
            tooltip={
              isFavorite
                ? t('query-library.item.unfavorite', 'Unfavorite')
                : t('query-library.item.favorite', 'Favorite')
            }
            name={isFavorite ? 'favorite' : 'star'}
            onClick={isFavorite ? onUnfavorite : onFavorite}
            iconType={isFavorite ? 'mono' : 'default'}
            disabled={disabled}
            data-testid={selectors.components.queryLibraryDrawer.favoriteButton}
          />
        )}

        {usingHistory && (
          <IconButton
            id={`history-${queryRow.uid}`}
            tooltip={t('query-library.item.add-to-library', 'Save query')}
            name="plus-circle"
            onClick={() =>
              onAddHistoryQueryToLibrary({
                ...queryRow,
                uid: undefined,
                title: t('explore.query-library.default-title', 'New query'),
              })
            }
            iconType="default"
          />
        )}
        {isNew && (
          <Badge
            data-testid={selectors.components.queryLibraryDrawer.newBadge}
            text={t('query-library.item.new', 'New')}
            color="orange"
          />
        )}
      </Stack>
    </label>
  );
}

const QueryLibraryItemSkeleton: SkeletonComponent = ({ rootProps }) => {
  const styles = useStyles2(getStyles);
  const skeletonStyles = useStyles2(getSkeletonStyles);
  return (
    <div className={styles.label} {...rootProps}>
      <div className={skeletonStyles.wrapper}>
        <Skeleton containerClassName={skeletonStyles.icon} circle width={16} height={16} />
        <Skeleton width={120} />
      </div>
    </div>
  );
};

const getSkeletonStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    alignItems: 'center',
    display: 'flex',
    gap: theme.spacing(1),
    overflow: 'hidden',
  }),
  icon: css({
    display: 'block',
    lineHeight: 1,
  }),
});

export const QueryLibraryItem = attachSkeleton(QueryLibraryItemComponent, QueryLibraryItemSkeleton);

const getStyles = (theme: GrafanaTheme2) => ({
  input: css({
    cursor: 'pointer',
    inset: 0,
    opacity: 0,
    position: 'absolute',
  }),
  label: css({
    width: '100%',
    padding: theme.spacing(2, 2, 2, 1),
    position: 'relative',

    // Add transitions for smooth highlighting fade-out
    [theme.transitions.handleMotion('no-preference')]: {
      transition: theme.transitions.create(['background-color', 'border-color'], {
        duration: theme.transitions.duration.standard,
      }),
    },

    ':has(:checked)': {
      backgroundColor: theme.colors.action.selected,
    },

    ':has(:focus-visible)': css({
      backgroundColor: theme.colors.action.hover,
      outline: `2px solid ${theme.colors.primary.main}`,
      outlineOffset: '-2px',
    }),

    '.favoriteButton': {
      display: 'none',
    },
    ':has(:hover)': {
      '.favoriteButton': {
        display: 'inline-flex',
      },
    },
  }),
  highlighted: css({
    backgroundColor: theme.colors.success.transparent,
    border: `2px solid ${theme.colors.success.border}`,
    borderRadius: theme.shape.radius.default,

    // Override selected state when highlighted
    ':has(:checked)': {
      backgroundColor: theme.colors.success.transparent,
      border: `2px solid ${theme.colors.success.border}`,
    },
  }),
  displayFavoriteButton: css({
    '.favoriteButton': {
      display: 'inline-flex',
    },
  }),
  logo: css({
    width: '20px',
    height: 'auto',
    objectFit: 'contain',
  }),
  disabled: css({
    opacity: 0.5,
    cursor: 'not-allowed',
  }),
  favoriteButton: css({
    display: 'none',
  }),
});
