import { css } from '@emotion/css';
import { type RefObject } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { ScrollContainer, useStyles2 } from '@grafana/ui';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { SavedQueryCard } from './SavedQueryCard';

type Props = {
  queryRows: SavedQuery[];
  newQuery: SavedQuery | undefined;
  isLoading: boolean;
  selectedUid: string | undefined;
  liveTitle: string | undefined;
  listRef: RefObject<HTMLDivElement>;
  onSelect: (query: SavedQuery) => void;
};

// Scrollable list of query cards. Shows skeletons while loading, an empty state when no results exist,
// and pins the new-query card at the top when a save is in progress.
export function SavedQueriesList({ queryRows, newQuery, isLoading, selectedUid, liveTitle, listRef, onSelect }: Props) {
  const styles = useStyles2(getStyles);
  const { isEditingQuery } = useQueryLibraryContext();

  if (isLoading) {
    return (
      <ScrollContainer>
        <div className={styles.listContent}>
          {Array.from({ length: 20 }, (_, i) => (
            <SavedQueryCard.Skeleton key={i} />
          ))}
        </div>
      </ScrollContainer>
    );
  }

  return (
    <ScrollContainer>
      <div
        className={styles.listContent}
        ref={listRef}
        role="radiogroup"
        aria-label={t('saved-queries.list.radiogroup-label', 'Saved queries')}
      >
        {newQuery && (
          <SavedQueryCard
            key="new-query"
            queryRow={liveTitle ? { ...newQuery, title: liveTitle } : newQuery}
            isSelected
            isTabbable
            onSelect={onSelect}
          />
        )}
        {queryRows.map((query, index) => (
          <SavedQueryCard
            key={query.uid}
            // Mirror the live title being typed in the details panel so the card updates instantly.
            // Only applies to the selected card, and only when there's no pending new query (which owns liveTitle then).
            queryRow={query.uid === selectedUid && liveTitle && !newQuery ? { ...query, title: liveTitle } : query}
            isSelected={selectedUid === query.uid}
            // Roving tabindex: the selected card is tabbable; if nothing is selected, the first card is,
            // so the list is always reachable by keyboard even when no query has been chosen yet.
            isTabbable={selectedUid === query.uid || (!selectedUid && !newQuery && index === 0)}
            disabled={!!newQuery || isEditingQuery}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollContainer>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  listContent: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    paddingRight: theme.spacing(1),
    paddingTop: 0,
    [theme.breakpoints.down('lg')]: {
      paddingRight: theme.spacing(2),
    },
  }),
});
