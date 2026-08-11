import { useBooleanFlagValue } from '@openfeature/react-sdk';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { type CoreApp } from '@grafana/data';
import { config } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import {
  QueryLibraryContext,
  type QueryLibraryDrawerOptions,
  type RenderSavedQueryButtonsOptions,
} from 'app/features/explore/QueryLibrary/QueryLibraryContext';

import {
  type SavedQuery,
  type OnSelectQueriesType,
  type OnSelectQueryType,
} from '../../features/explore/QueryLibrary/types';

import { type QueryDetails } from './QueryLibrary/QueryLibraryDetails';
import { QueryLibraryInteractions } from './QueryLibraryAnalyticsEvents';
import { QueryLibraryDrawer } from './QueryLibraryDrawer';
import { QueryLibraryEditingHeader } from './QueryLibraryEditingHeader';
import { SavedQueriesModal } from './SavedQueries/SavedQueriesModal';
import { SavedQueryButtons } from './SavedQueryButtons';
import { type QueryLibraryEventsPropertyMap, QueryLibraryTab } from './types';
import { setUserStorageFavorites } from './utils/favorites';
import { hasWritePermissions } from './utils/identity';

import { getQueryLibraryDrawerAction, getQueryLibraryRenderContext } from './index';

const allowCloseGuard = (): boolean => true;

export function QueryLibraryContextProvider({ children }: PropsWithChildren) {
  const isNewSavedQueriesEnabled = useBooleanFlagValue('newSavedQueriesExperience', false);
  // SAVED QUERIES STATE
  // Context / Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [context, setContext] = useState('unknown');
  const [activeTab, setActiveTab] = useState(QueryLibraryTab.ALL);
  const [activeDatasources, setActiveDatasources] = useState<string[]>([]);

  // Callback State
  const [onSelectQuery, setOnSelectQuery] = useState<OnSelectQueryType>(() => () => {});
  const [onSelectQueries, setOnSelectQueries] = useState<OnSelectQueriesType | undefined>(undefined);
  const [onSave, setOnSave] = useState<(() => void) | undefined>(undefined);
  const [userFavorites, setUserFavorites] = useState<{ [key: string]: boolean }>({});
  // Guard checked via ref so closeDrawer does not close over stale guard state; React state kept for parity with setCloseGuard registration.
  const closeGuardRef = useRef<() => boolean>(allowCloseGuard);
  const [, setCloseGuard] = useState<() => boolean>(() => allowCloseGuard);

  // Query Specific State
  const [newQuery, setNewQuery] = useState<SavedQuery | undefined>(undefined);
  const [highlightedQuery, setHighlightedQuery] = useState<string | undefined>(undefined);
  const [isEditingQuery, setIsEditingQuery] = useState(!!newQuery);
  const [openedToSaveQuery, setOpenedToSaveQuery] = useState(false);

  // Template variable overrides (used when selecting a query with unresolved template variables)
  const [templateVariableOverrides, setTemplateVariableOverrides] = useState<Record<string, string>>({});

  const QueryDetailsFormMethods = useFormContext<QueryDetails>();

  useEffect(() => {
    // Update tab to All if editing a new query
    if (newQuery && activeTab !== QueryLibraryTab.ALL) {
      setActiveTab(QueryLibraryTab.ALL);
    }
  }, [newQuery, activeTab, setActiveTab]);

  // Clear the externally-initiated flag as soon as the pending new query is gone
  // (either saved successfully or cancelled), so it doesn't leak into subsequent edits.
  useEffect(() => {
    if (!newQuery) {
      setOpenedToSaveQuery(false);
    }
  }, [newQuery]);

  // SAVED QUERIES CALLBACKS
  const triggerAnalyticsEvent = useCallback(
    (
      handleAnalyticEvent: (properties?: QueryLibraryEventsPropertyMap) => void,
      properties?: QueryLibraryEventsPropertyMap,
      contextOverride?: string
    ) => {
      const appContext = contextOverride || context;
      const propertiesWithContext = { app: appContext, is_v2: isNewSavedQueriesEnabled, ...properties };
      handleAnalyticEvent(propertiesWithContext);
    },
    [context, isNewSavedQueriesEnabled]
  );

  const onFavorite = useCallback(
    async (uid: string) => {
      const prevFavorites = { ...userFavorites };

      const newUserFavorites = { ...prevFavorites, [uid]: true };
      try {
        setUserFavorites(newUserFavorites);
        await setUserStorageFavorites(newUserFavorites);
        triggerAnalyticsEvent(QueryLibraryInteractions.favoriteQueryClicked, { favoriteState: true });
      } catch (e) {
        setUserFavorites(prevFavorites);
      }
    },
    [userFavorites, triggerAnalyticsEvent]
  );

  const onUnfavorite = useCallback(
    async (uid: string) => {
      const prevFavorites = { ...userFavorites };

      const newUserFavorites = { ...prevFavorites };
      delete newUserFavorites[uid];
      try {
        setUserFavorites(newUserFavorites);
        await setUserStorageFavorites(newUserFavorites);
        triggerAnalyticsEvent(QueryLibraryInteractions.favoriteQueryClicked, { favoriteState: false });
      } catch (e) {
        setUserFavorites(prevFavorites);
      }
    },
    [userFavorites, triggerAnalyticsEvent]
  );

  // Auto-clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedQuery) {
      const timer = setTimeout(() => {
        setHighlightedQuery(undefined);
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [highlightedQuery]);

  const openDrawer = useCallback(
    ({ datasourceFilters, onSelectQuery, onSelectQueries, options, query }: QueryLibraryDrawerOptions) => {
      // this means the user is trying to save a query but doesn't have write permission
      if (!!query && !hasWritePermissions()) {
        return;
      }

      setActiveDatasources(datasourceFilters || []);
      setOnSave(() => options?.onSave);
      // Reset selection-time template variable overrides whenever the drawer opens
      setTemplateVariableOverrides({});
      closeGuardRef.current = allowCloseGuard;
      // Update the callback state
      if (onSelectQuery) {
        setOnSelectQuery(() => onSelectQuery);
      }
      setOnSelectQueries(() => onSelectQueries);
      setIsDrawerOpen(true);
      setContext(getQueryLibraryRenderContext(options?.context));
      // Set enhanced options
      setHighlightedQuery(options?.highlightQuery);

      triggerAnalyticsEvent(
        QueryLibraryInteractions.queryLibraryOpened,
        {
          mode: getQueryLibraryDrawerAction({ query, options }),
        },
        options?.context
      );

      if (!!query) {
        setNewQuery({ query, description: options?.description });
        setIsEditingQuery(true);
        setOpenedToSaveQuery(true);
        triggerAnalyticsEvent(QueryLibraryInteractions.saveQueryToLibraryClicked, undefined, options?.context);
      } else {
        options?.isReplacingQuery
          ? triggerAnalyticsEvent(
              QueryLibraryInteractions.replaceWithQueryFromLibraryClicked,
              undefined,
              options?.context
            )
          : triggerAnalyticsEvent(QueryLibraryInteractions.addQueryFromLibraryClicked, undefined, options?.context);
      }
    },
    [triggerAnalyticsEvent]
  );

  const handleSetCloseGuard = useCallback((shouldAllowClose: () => boolean) => {
    closeGuardRef.current = shouldAllowClose;
    setCloseGuard(() => shouldAllowClose);
  }, []);

  const clearCloseGuard = useCallback(() => {
    closeGuardRef.current = allowCloseGuard;
    setCloseGuard(() => allowCloseGuard);
  }, []);

  const closeDrawer = useCallback(
    (isSelectingQuery?: boolean, closedToEditInExplore?: boolean) => {
      if (!closeGuardRef.current()) {
        return;
      }

      setActiveDatasources([]);
      // Reset the callback to no-op function
      setOnSelectQuery(() => () => {});
      setNewQuery(undefined);
      setIsEditingQuery(false);
      setTemplateVariableOverrides({});
      setIsDrawerOpen(false);
      closeGuardRef.current = allowCloseGuard;
      setCloseGuard(() => allowCloseGuard);

      // Clear enhanced options
      setHighlightedQuery(undefined);

      if (closedToEditInExplore) {
        QueryDetailsFormMethods?.reset();

        triggerAnalyticsEvent(QueryLibraryInteractions.queryLibraryClosedToEditQueryInExplore);
      } else if (!isSelectingQuery && !newQuery) {
        triggerAnalyticsEvent(QueryLibraryInteractions.queryLibraryClosedWithoutSelection);
      } else if (newQuery) {
        triggerAnalyticsEvent(QueryLibraryInteractions.queryLibraryClosedWithoutSavingNewQUery);
      }
    },
    [newQuery, QueryDetailsFormMethods, triggerAnalyticsEvent]
  );

  const onAddHistoryQueryToLibrary = useCallback(
    (newQuery: SavedQuery) => {
      setNewQuery(newQuery);
      setIsEditingQuery(true);
      triggerAnalyticsEvent(QueryLibraryInteractions.saveRecentQueryClicked);
    },
    [triggerAnalyticsEvent]
  );

  const onTabChange = useCallback(
    (tab: QueryLibraryTab) => {
      triggerAnalyticsEvent(QueryLibraryInteractions.tabClicked, { tab });
      setActiveTab(tab);
    },
    [triggerAnalyticsEvent, setActiveTab]
  );

  const contextVal = useMemo(
    () => ({
      clearCloseGuard,
      closeDrawer,
      onAddHistoryQueryToLibrary,
      onFavorite,
      onSave,
      onSelectQuery,
      onSelectQueries,
      onTabChange,
      onUnfavorite,
      openDrawer,
      renderQueryLibraryEditingHeader: (
        query: DataQuery,
        app?: CoreApp,
        queryLibraryRef?: string,
        onCancelEdit?: () => void,
        onUpdateSuccess?: () => void,
        onSelectQuery?: (query: DataQuery) => void
      ) => (
        <QueryLibraryEditingHeader
          query={query}
          app={app}
          queryLibraryRef={queryLibraryRef}
          onCancelEdit={onCancelEdit}
          onUpdateSuccess={onUpdateSuccess}
          onSelectQuery={onSelectQuery}
        />
      ),
      renderSavedQueryButtons: ({
        query,
        app,
        onUpdateSuccess,
        onSelectQuery,
        datasourceFilters,
        parentRef,
        showAsButtonHeader,
        onSelectQueries,
      }: RenderSavedQueryButtonsOptions) => (
        <SavedQueryButtons
          query={query}
          app={app}
          onUpdateSuccess={onUpdateSuccess}
          onSelectQuery={onSelectQuery}
          onSelectQueries={onSelectQueries}
          datasourceFilters={datasourceFilters || []}
          parentRef={parentRef}
          showAsButtonHeader={showAsButtonHeader}
        />
      ),
      setActiveTab,
      setIsEditingQuery,
      setNewQuery,
      triggerAnalyticsEvent,
      activeDatasources,
      activeTab,
      context,
      highlightedQuery,
      isDrawerOpen,
      isEditingQuery,
      newQuery,
      queryLibraryEnabled: Boolean(config.featureToggles.queryLibrary),
      userFavorites,
      setUserFavorites,
      setCloseGuard: handleSetCloseGuard,
      templateVariableOverrides,
      setTemplateVariableOverrides,
      openedToSaveQuery,
    }),
    [
      clearCloseGuard,
      closeDrawer,
      onAddHistoryQueryToLibrary,
      onFavorite,
      onSave,
      onSelectQuery,
      onSelectQueries,
      onTabChange,
      onUnfavorite,
      openDrawer,
      setActiveTab,
      setIsEditingQuery,
      setNewQuery,
      triggerAnalyticsEvent,
      activeDatasources,
      activeTab,
      context,
      highlightedQuery,
      isDrawerOpen,
      isEditingQuery,
      newQuery,
      userFavorites,
      setUserFavorites,
      handleSetCloseGuard,
      templateVariableOverrides,
      openedToSaveQuery,
    ]
  );

  return (
    <QueryLibraryContext.Provider value={contextVal}>
      {children}
      {isNewSavedQueriesEnabled ? <SavedQueriesModal /> : <QueryLibraryDrawer />}
    </QueryLibraryContext.Provider>
  );
}
