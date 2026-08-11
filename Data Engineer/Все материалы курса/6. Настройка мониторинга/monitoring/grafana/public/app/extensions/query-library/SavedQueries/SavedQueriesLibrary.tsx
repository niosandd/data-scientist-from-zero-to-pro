import { css } from '@emotion/css';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { EmptyState, useStyles2 } from '@grafana/ui';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { SavedQueriesDetails } from './SavedQueriesDetails';
import { SavedQueriesList } from './SavedQueriesList';

type Props = {
  queryRows: SavedQuery[];
  newQuery: SavedQuery | undefined;
  isLoading: boolean;
};

// Manages selection state and renders the split view: scrollable query list on the left, query details on the right.
export function SavedQueriesLibrary({ queryRows, newQuery, isLoading }: Props) {
  const styles = useStyles2(getStyles);
  const [selectedUid, setSelectedUid] = useState<string | undefined>();
  const [liveTitle, setLiveTitle] = useState<string | undefined>();
  const { highlightedQuery } = useQueryLibraryContext();
  const listRef = useRef<HTMLDivElement>(null);
  // Tracks a uid that was just created and hasn't appeared in queryRows yet.
  // Prevents the auto-select-first effect from overriding the selection before the list refetches.
  const pendingNewUidRef = useRef<string | undefined>(undefined);

  // Auto-select and scroll to highlighted query when it arrives in the list
  useEffect(() => {
    if (!highlightedQuery) {
      return;
    }
    const inList = queryRows.some((q) => q.uid === highlightedQuery);
    if (!inList) {
      return;
    }
    setSelectedUid(highlightedQuery);
    const timer = window.setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-query-uid="${highlightedQuery}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [highlightedQuery, queryRows]);

  // Auto-select the first query when loading finishes with no selection,
  // or when a filter change causes the selected query to leave the visible list.
  // Yields to the highlightedQuery effect when a specific query should be shown.
  useEffect(() => {
    if (isLoading || queryRows.length === 0 || newQuery) {
      return;
    }
    // The highlightedQuery effect handles selection when a specific query is targeted;
    // both effects run in the same pass so we must check highlightedQuery directly
    // (the state update from the sibling effect hasn't flushed yet).
    if (highlightedQuery && queryRows.some((q) => q.uid === highlightedQuery)) {
      return;
    }
    // A newly created query may not have arrived in queryRows yet (list still refetching).
    // Don't override the pending selection — wait for it to appear.
    if (pendingNewUidRef.current && !queryRows.some((q) => q.uid === pendingNewUidRef.current)) {
      return;
    }
    const selectedStillVisible = queryRows.some((q) => q.uid === selectedUid);
    if (!selectedUid || !selectedStillVisible) {
      setSelectedUid(queryRows[0].uid);
    }
  }, [isLoading, queryRows, selectedUid, newQuery, highlightedQuery]);

  // Clear the pending uid once the newly created query appears in the list.
  useEffect(() => {
    if (pendingNewUidRef.current && queryRows.some((q) => q.uid === pendingNewUidRef.current)) {
      pendingNewUidRef.current = undefined;
    }
  }, [queryRows]);

  // Scroll to top when a new pending query arrives (it's always rendered first)
  useEffect(() => {
    if (newQuery) {
      listRef.current?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [newQuery]);

  const selectedQuery = useMemo(() => {
    // newQuery always takes priority — it's a pending save that needs immediate attention
    if (newQuery) {
      return newQuery;
    }
    if (!selectedUid) {
      return undefined;
    }
    return queryRows.find((q) => q.uid === selectedUid);
  }, [selectedUid, queryRows, newQuery]);

  if (!isLoading && !newQuery && queryRows.length === 0) {
    return (
      <div
        className={styles.library}
        role="region"
        aria-label={t('saved-queries.library.region-label', 'Query library')}
      >
        <div className={styles.emptyStateContainer}>
          <EmptyState variant="not-found" message={t('saved-queries.list.empty', 'No saved queries found')} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.library} role="region" aria-label={t('saved-queries.library.region-label', 'Query library')}>
      <div className={styles.half}>
        <SavedQueriesList
          queryRows={queryRows}
          newQuery={newQuery}
          isLoading={isLoading}
          selectedUid={selectedUid}
          liveTitle={liveTitle}
          listRef={listRef}
          onSelect={(query) => {
            pendingNewUidRef.current = undefined;
            setSelectedUid(query.uid);
          }}
        />
      </div>
      <div className={styles.half}>
        <SavedQueriesDetails
          selectedQuery={selectedQuery}
          onTitleChange={setLiveTitle}
          onDelete={() => setSelectedUid(undefined)}
          onSaveNew={(uid) => {
            pendingNewUidRef.current = uid;
            setSelectedUid(uid);
          }}
        />
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  library: css({
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    [theme.breakpoints.down('lg')]: {
      flexDirection: 'column',
    },
  }),
  emptyStateContainer: css({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  half: css({
    flex: '1 1 0%',
    minWidth: 0,
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('lg')]: {
      flex: 'none',
      height: '50%',
    },
  }),
});
