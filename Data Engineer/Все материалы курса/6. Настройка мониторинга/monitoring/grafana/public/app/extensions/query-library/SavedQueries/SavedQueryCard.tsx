import { css, cx } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { IconButton, Tag, Text, useStyles2 } from '@grafana/ui';
import { attachSkeleton, type SkeletonComponent } from '@grafana/ui/unstable';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';
import icnDatasourceSvg from 'img/icn-datasource.svg';

import { useDatasource } from '../utils/useDatasource';

const RADIO_GROUP_NAME = 'saved-queries-list';

type Props = {
  queryRow: SavedQuery;
  isSelected: boolean;
  disabled?: boolean;
  /** Whether this card's radio input should be in the tab order (roving tabindex pattern). */
  isTabbable?: boolean;
  onSelect: (query: SavedQuery) => void;
};

// Individual list item for a saved query: displays title, datasource, author, tags, and a star/unstar button.
function SavedQueryCardComponent({ queryRow, isSelected, disabled, isTabbable, onSelect }: Props) {
  const styles = useStyles2(getStyles);
  const { value: datasourceApi } = useDatasource(queryRow.datasourceRef);
  const { userFavorites, onFavorite, onUnfavorite, highlightedQuery } = useQueryLibraryContext();

  const isFavorite = userFavorites[queryRow.uid ?? ''] ?? false;
  const isHighlighted = queryRow.uid !== undefined && highlightedQuery === queryRow.uid;
  const logoSrc = datasourceApi?.meta.info.logos.small || icnDatasourceSvg;

  return (
    <label
      htmlFor={queryRow.uid}
      data-query-uid={queryRow.uid}
      aria-current={isHighlighted ? 'true' : undefined}
      className={cx(
        styles.card,
        isSelected && styles.cardSelected,
        isHighlighted && styles.cardHighlighted,
        isFavorite && styles.alwaysShowStar,
        disabled && styles.cardDisabled
      )}
    >
      <input
        type="radio"
        id={queryRow.uid}
        name={RADIO_GROUP_NAME}
        className={styles.input}
        onChange={() => onSelect(queryRow)}
        checked={isSelected}
        disabled={disabled}
        tabIndex={isTabbable ? 0 : -1}
        aria-label={t('saved-queries.card.aria-label', '{{title}}, {{datasource}}, by {{author}}', {
          title: queryRow.title ?? t('saved-queries.card.untitled', 'Untitled'),
          datasource: queryRow.datasourceName ?? t('saved-queries.card.unknown-datasource', 'Unknown datasource'),
          author:
            queryRow.user?.displayName ??
            queryRow.user?.uid ??
            t('saved-queries.card.unknown-author', 'Unknown author'),
        })}
      />

      {/* Row 1: Title + Datasource + Star */}
      <div className={styles.row}>
        <div className={styles.titleSection}>
          <Text>{queryRow.title ?? ''}</Text>
        </div>
        <div className={styles.dsSection}>
          <img className={styles.dsIcon} src={logoSrc} alt={datasourceApi?.type ?? ''} />
          <div className={styles.dsText}>
            <Text variant="bodySmall" color="secondary">
              {queryRow.datasourceName ?? ''}
            </Text>
          </div>
        </div>
        {queryRow.uid && (
          // aria-label instead of tooltip so tabIndex is not overridden by Tooltip's cloneElement (which forces tabIndex=0)
          <IconButton
            className={styles.starButton}
            aria-label={isFavorite ? t('saved-queries.card.unstar', 'Unstar') : t('saved-queries.card.star', 'Star')}
            name={isFavorite ? 'favorite' : 'star'}
            iconType={isFavorite ? 'mono' : 'default'}
            onClick={isFavorite ? () => onUnfavorite(queryRow.uid ?? '') : () => onFavorite(queryRow.uid ?? '')}
            tabIndex={isSelected ? 0 : -1}
          />
        )}
      </div>

      {/* Row 2: Author + Tags */}
      <div className={styles.row}>
        <div className={styles.authorSection}>
          {queryRow.user?.avatarUrl && (
            <img className={styles.avatar} src={queryRow.user.avatarUrl} alt={queryRow.user.displayName ?? ''} />
          )}
          <Text variant="bodySmall" color="secondary" truncate>
            {queryRow.user?.displayName ?? queryRow.user?.uid ?? ''}
          </Text>
        </div>
        <div className={styles.tagsSection}>
          {(queryRow.tags ?? []).map((tag) => (
            <Tag key={tag} name={tag} />
          ))}
        </div>
      </div>
    </label>
  );
}

const SavedQueryCardSkeleton: SkeletonComponent = ({ rootProps }) => {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.skeletonCard} {...rootProps}>
      {/* Row 1: title | ds icon + ds name | star */}
      <div className={styles.row}>
        <div className={styles.titleSection}>
          <Skeleton width={130} />
        </div>
        <div className={styles.skeletonInlineRow}>
          <Skeleton circle width={16} height={16} containerClassName={styles.skeletonIconContainer} />
          <Skeleton width={70} />
        </div>
      </div>
      {/* Row 2: avatar + author | tags */}
      <div className={styles.row}>
        <div className={styles.skeletonInlineRow}>
          <Skeleton circle width={16} height={16} containerClassName={styles.skeletonIconContainer} />
          <Skeleton width={80} />
        </div>
        <div className={styles.tagsSection} />
      </div>
    </div>
  );
};

export const SavedQueryCard = attachSkeleton(SavedQueryCardComponent, SavedQueryCardSkeleton);

const getStyles = (theme: GrafanaTheme2) => {
  const cardBase = css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.secondary,
  });

  const truncate = css({
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  });

  const icon16 = css({
    width: '16px',
    height: '16px',
    flexShrink: 0,
  });

  return {
    input: css({
      cursor: 'pointer',
      inset: 0,
      opacity: 0,
      position: 'absolute',
    }),
    card: css(cardBase, {
      position: 'relative',
      cursor: 'pointer',

      [theme.transitions.handleMotion('no-preference')]: {
        transition: theme.transitions.create(['background-color', 'outline-color'], {
          duration: theme.transitions.duration.short,
        }),
      },

      ':has(:checked)': { backgroundColor: theme.colors.action.selected },
      ':has(:focus-visible)': {
        outline: `2px solid ${theme.colors.primary.main}`,
        outlineOffset: '-2px',
      },
      ':has(:hover)': {
        backgroundColor: theme.colors.action.hover,
        '.starButton': { display: 'inline-flex' },
      },
      '.starButton': { display: 'none' },
    }),
    cardSelected: css({ backgroundColor: theme.colors.action.selected }),
    cardHighlighted: css({
      backgroundColor: theme.colors.success.transparent,
      outline: `2px solid ${theme.colors.success.border}`,
      outlineOffset: '-2px',
      ':has(:checked)': { backgroundColor: theme.colors.success.transparent },
    }),
    cardDisabled: css({
      opacity: theme.colors.action.disabledOpacity,
      pointerEvents: 'none',
    }),
    alwaysShowStar: css({ '.starButton': { display: 'inline-flex' } }),
    row: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      minWidth: 0,
    }),
    titleSection: css(truncate, { flexShrink: 0, maxWidth: '60%' }),
    dsSection: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      marginLeft: theme.spacing(1),
    }),
    dsText: css(truncate, { flex: 1, lineHeight: 1 }),
    authorSection: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      flexShrink: 0,
      minWidth: 0,
      maxWidth: '45%',
      overflow: 'hidden',
    }),
    tagsSection: css({
      flex: 1,
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(0.5),
      minWidth: 0,
      span: { backgroundColor: theme.colors.border.medium },
    }),
    dsIcon: css(icon16, { objectFit: 'contain' }),
    avatar: css(icon16, { borderRadius: theme.shape.radius.circle }),
    starButton: css({}),
    // Skeleton-specific styles
    skeletonCard: cardBase,
    skeletonInlineRow: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      flexShrink: 0,
    }),
    skeletonIconContainer: css({ display: 'block', lineHeight: 1 }),
  };
};
