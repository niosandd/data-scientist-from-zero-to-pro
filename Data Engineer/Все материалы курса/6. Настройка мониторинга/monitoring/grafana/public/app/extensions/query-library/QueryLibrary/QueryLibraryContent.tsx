import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { Trans, t } from '@grafana/i18n';
import { Box, Divider, EmptyState, ScrollContainer, Stack } from '@grafana/ui';
import { attachSkeleton, type SkeletonComponent } from '@grafana/ui/unstable';
import { generatedAPI } from 'app/extensions/api/clients/queries/v1beta1/endpoints.gen';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';

import { type SavedQuery } from '../../../features/explore/QueryLibrary/types';
import { showDiscardAddQueryModal } from '../index';
import { QueryLibraryTab } from '../types';

import { type QueryDetails, QueryLibraryDetails } from './QueryLibraryDetails';
import { QueryLibraryForm } from './QueryLibraryForm';
import { QueryLibraryItem } from './QueryLibraryItem';

export interface QueryLibraryContentProps {
  isFiltered?: boolean;
  queryRows: SavedQuery[];
  usingHistory?: boolean;
  isLoading: boolean;
  newQuery?: SavedQuery;
}

function QueryLibraryContentComponent({
  isFiltered,
  queryRows,
  usingHistory,
  isLoading,
  newQuery,
}: QueryLibraryContentProps) {
  const {
    closeDrawer,
    onFavorite,
    onUnfavorite,
    setNewQuery,
    setIsEditingQuery,
    activeTab,
    context,
    highlightedQuery,
    isEditingQuery,
    userFavorites,
    setCloseGuard,
  } = useQueryLibraryContext();

  const [selectedQueryRowIndex, setSelectedQueryRowIndex] = useState<number>(0);
  const queryItemsRef = useRef<HTMLDivElement>(null); // to handle auto-scrolling when highlightedQuery is set
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lastUpdatedUid, setLastUpdatedUid] = useState<string>();

  const isEmpty = queryRows.length === 0 && !newQuery && !isLoading;

  const { isSuccess, isFetching } = generatedAPI.endpoints.listQuery.useQueryState({});

  useEffect(() => {
    // If selected index is out of bounds, get closest query
    if (queryRows.length > 0 && !queryRows[selectedQueryRowIndex]) {
      const closesQueryRowIndex = Math.min(selectedQueryRowIndex - 1, queryRows.length - 1);
      setSelectedQueryRowIndex(closesQueryRowIndex);
    }
  }, [queryRows, selectedQueryRowIndex, setSelectedQueryRowIndex]);

  const currentQuery: SavedQuery | undefined = useMemo(() => {
    return newQuery ?? queryRows[selectedQueryRowIndex];
  }, [newQuery, queryRows, selectedQueryRowIndex]);

  const { reset, watch, formState, ...rest } = useForm<QueryDetails>({
    defaultValues: {
      title: currentQuery?.title ?? '',
      description: currentQuery?.description ?? '',
      tags: currentQuery?.tags ?? [],
      isVisible: currentQuery?.isVisible ?? true,
    },
  });

  const { isDirty } = formState;

  // Reset form after discarding changes
  const resetForm = useCallback(() => {
    reset();
    if (!currentQuery?.uid) {
      setNewQuery(undefined);
    }
    setIsEditingQuery(false);
    setCloseGuard(() => true);
  }, [reset, currentQuery?.uid, setNewQuery, setCloseGuard, setIsEditingQuery]);

  // Set up close guard to check for unsaved changes before allowing drawer to close
  useEffect(() => {
    const guardFunction = () => {
      if (isEditingQuery && isDirty && context !== 'unknown') {
        showDiscardAddQueryModal(resetForm);
        return false; // Prevent closing
      }
      return true; // Allow closing
    };

    setCloseGuard(guardFunction);

    // Cleanup on unmount
    return () => {
      setCloseGuard(() => true);
    };
  }, [isEditingQuery, isDirty, resetForm, setCloseGuard, context]);

  // Resets React Form Hook with new default values when selecting new query in library
  useEffect(() => {
    reset({
      title: currentQuery?.title,
      description: currentQuery?.description,
      tags: currentQuery?.tags ?? [],
      isVisible: currentQuery?.isVisible,
    });
  }, [currentQuery, reset]);

  useEffect(() => {
    if (isSuccess && !isFetching && !newQuery) {
      if (highlightedQuery && queryRows.length > 0) {
        // Auto-select highlighted query when specified
        const highlightIndex = queryRows.findIndex((row) => row.uid === highlightedQuery);
        if (highlightIndex !== -1) {
          setSelectedQueryRowIndex(highlightIndex);
          setIsEditingQuery(false); // Ensure we're not in edit mode

          // Scroll to the highlighted query
          const highlightedElement = queryItemsRef.current?.querySelector(`[data-query-uid="${highlightedQuery}"]`);
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        }
      } else {
        const newIndex = queryRows.findIndex((q) => q.uid === lastUpdatedUid);
        if (newIndex !== -1) {
          setSelectedQueryRowIndex(newIndex);
        } else {
          setSelectedQueryRowIndex((prevState) =>
            queryRows[prevState] || prevState === 0 ? prevState : queryRows.length - 1
          );
        }
      }
    }
  }, [queryRows, isSuccess, isFetching, lastUpdatedUid, highlightedQuery, newQuery, usingHistory, setIsEditingQuery]);

  useEffect(() => {
    if (newQuery) {
      setIsEditingQuery(true);
      // Scroll to the new query
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [newQuery, setIsEditingQuery]);

  const onEditQuerySuccess = (uid: string, isNew?: boolean) => {
    setIsEditingQuery(false);
    if (isNew) {
      setNewQuery(undefined);
    }
    setLastUpdatedUid(uid);
    // Closing the drawer if not in explore or panel editor
    if (context === 'unknown') {
      closeDrawer();
    }
  };

  const formTitle = watch('title');
  const itemList = queryRows.map((queryRow, index) => (
    <Fragment key={queryRow.uid}>
      <QueryLibraryItem
        data-query-uid={queryRow.uid}
        isSelected={currentQuery?.uid === queryRow.uid}
        isFavorite={userFavorites?.[queryRow.uid ?? ''] ?? false}
        onFavorite={() => onFavorite(queryRow.uid ?? '')}
        onUnfavorite={() => onUnfavorite(queryRow.uid ?? '')}
        isHighlighted={highlightedQuery === queryRow.uid}
        onSelectQueryRow={() => {
          setSelectedQueryRowIndex(index);
          setIsEditingQuery(false);
        }}
        queryRow={{
          ...queryRow,
          title: currentQuery?.uid === queryRow.uid && isEditingQuery ? formTitle : queryRow.title,
        }}
        usingHistory={usingHistory}
        disabled={!!newQuery}
        favoritesEnabled={activeTab !== QueryLibraryTab.RECENT}
      />
      <Divider spacing={0} />
    </Fragment>
  ));

  if (isEmpty) {
    if (activeTab === QueryLibraryTab.RECENT) {
      return (
        <EmptyState
          message={t('query-library.empty-state.no-history', 'Find all your queries in one place')}
          variant="call-to-action"
        >
          <Trans i18nKey="query-library.empty-state.no-history-description">
            Queries you run in dashboards will appear here for easy access and reuse
          </Trans>
        </EmptyState>
      );
    } else if (!isFiltered && activeTab === QueryLibraryTab.FAVORITES) {
      return (
        <EmptyState
          message={t('query-library.empty-state.no-favorites', "You haven't favorited any queries yet")}
          variant="call-to-action"
        >
          <Trans i18nKey="query-library.empty-state.no-favorites-description">
            Start favoriting them from the All tab
          </Trans>
        </EmptyState>
      );
    }

    // search miss
    return isFiltered ? (
      <EmptyState message={t('query-library.not-found.title', 'No results found')} variant="not-found">
        <Trans i18nKey="query-library.not-found.message">Try adjusting your search or filter criteria</Trans>
      </EmptyState>
    ) : (
      // true empty state
      <EmptyState
        message={t('query-library.empty-state.title', "You haven't saved any queries yet")}
        variant="call-to-action"
      >
        <Trans i18nKey="query-library.empty-state.message">
          Start adding them from Explore or when editing a dashboard
        </Trans>
      </EmptyState>
    );
  }

  return (
    <FormProvider {...{ reset, watch, formState, ...rest }}>
      <Stack flex={1} gap={0} minHeight={0}>
        <Box display="flex" flex={1} minWidth={0}>
          <ScrollContainer ref={scrollContainerRef}>
            <Stack direction="column" gap={0} flex={1} minWidth={0} role="radiogroup" ref={queryItemsRef}>
              {newQuery && (
                <Stack data-query-uid="new-query">
                  <QueryLibraryItem
                    isSelected
                    onSelectQueryRow={() => {}}
                    queryRow={{ ...currentQuery, title: watch('title') }}
                    isNew
                  />
                </Stack>
              )}
              {isLoading && <QueryLibraryContent.Skeleton skeletonDetails={false} />}
              {itemList}
            </Stack>
          </ScrollContainer>
        </Box>
        <Divider direction="vertical" spacing={0} />
        <Box display="flex" flex={2} minWidth={0}>
          <ScrollContainer>
            <Box
              direction="column"
              display="flex"
              flex={1}
              paddingBottom={0}
              paddingLeft={2}
              paddingRight={1}
              paddingTop={2}
            >
              {currentQuery && (
                <QueryLibraryForm
                  selectedQueryRow={currentQuery}
                  onEditQuerySuccess={onEditQuerySuccess}
                  usingHistory={usingHistory}
                />
              )}
            </Box>
          </ScrollContainer>
        </Box>
      </Stack>
    </FormProvider>
  );
}

const QueryLibraryContentSkeleton: SkeletonComponent<{ skeletonDetails: boolean }> = ({
  rootProps,
  skeletonDetails,
}: {
  rootProps: { style: React.CSSProperties };
  skeletonDetails: boolean;
}) => {
  return (
    <Stack flex={1} gap={0} minHeight={0} {...rootProps} data-testid="query-library-skeleton">
      <Box display="flex" flex={1} minWidth={0}>
        <Stack direction="column" flex={1} gap={0} minWidth={0}>
          {new Array(5).fill(0).map((_, index) => (
            <Fragment key={index}>
              <QueryLibraryItem.Skeleton />
              <Divider spacing={0} />
            </Fragment>
          ))}
        </Stack>
      </Box>
      {skeletonDetails && (
        <>
          <Divider direction="vertical" spacing={0} />
          <Box display="flex" flex={2} minWidth={0}>
            <Box
              direction="column"
              display="flex"
              flex={1}
              paddingBottom={0}
              paddingLeft={2}
              paddingRight={1}
              paddingTop={2}
            >
              <QueryLibraryDetails.Skeleton />
            </Box>
          </Box>
        </>
      )}
    </Stack>
  );
};

export const QueryLibraryContent = attachSkeleton(QueryLibraryContentComponent, QueryLibraryContentSkeleton);
