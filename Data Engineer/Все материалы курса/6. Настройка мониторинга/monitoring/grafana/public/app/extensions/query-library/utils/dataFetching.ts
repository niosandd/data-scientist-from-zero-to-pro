import { skipToken } from '@reduxjs/toolkit/query';
import { compact, uniq } from 'lodash';
import { useAsync } from 'react-use';
import { type AsyncState } from 'react-use/lib/useAsync';

import { getDataSourceSrv } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { useGetDisplayMappingQuery } from 'app/api/clients/iam/v0alpha1';
import { contextSrv } from 'app/core/services/context_srv';
import { type SavedQuery, type SavedQueryBase } from 'app/features/explore/QueryLibrary/types';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

export function useLoadUsers(userUIDs: string[] | undefined) {
  const userQtList = uniq(compact(userUIDs));
  // Skip the request when there are no users to resolve. The display-mapping endpoint rejects an
  // empty key list with a 400, which surfaces as an error toast in the empty saved-queries state.
  return useGetDisplayMappingQuery(
    userQtList.length > 0
      ? {
          key: userQtList,
        }
      : skipToken
  );
}

// Explicitly type the result so TS knows to discriminate between the error result and good result by the error prop
// value.
type MetadataValue =
  | (SavedQuery & {
      error: undefined;
    })
  | {
      index: string;
      error: Error;
    };

/**
 * Map metadata to saved queries we get from the DB.
 * @param savedQueries
 * @param userDataList
 */
export function useLoadQueryMetadata(
  savedQueries: SavedQueryBase[] | undefined,
  userDataList: ReturnType<typeof useLoadUsers>['data']
): AsyncState<MetadataValue[] | undefined> {
  return useAsync(async () => {
    if (!(savedQueries && userDataList)) {
      return;
    }

    const rowsPromises = savedQueries.map(async (savedQuery: SavedQueryBase, index: number): Promise<MetadataValue> => {
      try {
        const datasourceRef = savedQuery.targets[0]?.datasource;
        const datasourceApi = await getDataSourceSrv().get(datasourceRef);
        const datasourceType = getDatasourceSrv().getInstanceSettings(datasourceRef)?.meta.name || '';
        const query = savedQuery.targets[0];
        const queryText = datasourceApi?.getQueryDisplayText?.(query);
        const datasourceName = datasourceApi?.name || '';
        const extendedUserData = userDataList.display.find(
          (user) => `${user?.identity.type}:${user?.identity.name}` === savedQuery.user?.uid
        );

        return {
          uid: savedQuery.uid,
          datasourceName,
          datasourceRef,
          datasourceType,
          createdAtTimestamp: savedQuery?.createdAtTimestamp || 0,
          query,
          queryText,
          title: savedQuery.title,
          description: savedQuery.description || '',
          tags: savedQuery.tags ?? [],
          isLocked: savedQuery.isLocked ?? false,
          isVisible: savedQuery.isVisible ?? false,
          user: {
            uid: savedQuery.user?.uid || '',
            displayName: extendedUserData?.displayName || '',
            avatarUrl: extendedUserData?.avatarURL || '',
          },
          error: undefined,
        };
      } catch (error) {
        // Instead of throwing we collect the errors in the result so upstream code can decide what to do.
        return {
          index: index.toString(),
          error: error instanceof Error ? error : new Error('unknown error ' + JSON.stringify(error)),
        };
      }
    });

    return Promise.all(rowsPromises);
  }, [savedQueries, userDataList]);
}

export const useGetNewSavedQuery = (query?: DataQuery, description?: string) => {
  const {
    data: userData,
    isLoading: isUserDataLoading,
    isError: isUserDataError,
  } = useLoadUsers(query ? [contextSrv.user.uid] : undefined);

  const {
    value: queryToAdd,
    loading: isQueryToAddLoading,
    error: queryToAddError,
  } = useAsync<() => Promise<SavedQuery | undefined>>(async () => {
    if (!query || isUserDataLoading) {
      return undefined;
    }
    const datasource = await getDataSourceSrv().get(query.datasource);
    const datasourceType = getDatasourceSrv().getInstanceSettings(query.datasource)?.meta.name || '';

    return {
      ...query,
      uid: undefined,
      query: query,
      queryText: datasource?.getQueryDisplayText?.(query),
      datasourceName: datasource.name,
      datasourceType,
      title: 'New query',
      description: description ?? '',
      tags: [],
      isVisible: true,
      isLocked: false,
      datasourceRef: query.datasource,
      createdAtTimestamp: new Date().getTime(),
      user: {
        uid: contextSrv.user?.uid || '',
        displayName: userData?.display[0]?.displayName || '',
        avatarUrl: userData?.display[0]?.avatarURL || '',
      },
    };
    // TODO: fix this dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, description, isUserDataLoading]);

  if (!query) {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
    };
  }

  return {
    data: queryToAdd,
    isLoading: isQueryToAddLoading || isUserDataLoading,
    isError: Boolean(queryToAddError) || isUserDataError,
  };
};
