import { useEffect, useMemo } from 'react';

import { AppEvents } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents } from '@grafana/runtime';
import { type QueryList } from 'app/extensions/api/clients/queries/v1beta1/endpoints.gen';
import { type SavedQueryBase } from 'app/features/explore/QueryLibrary/types';

import { useLoadQueryMetadata, useLoadUsers } from '../utils/dataFetching';
import { convertDataQueryResponseToSavedQueriesDTO } from '../utils/mappers';

export const useGetSavedQueries = (queries?: QueryList) => {
  const data = useMemo(() => (queries ? convertDataQueryResponseToSavedQueriesDTO(queries) : undefined), [queries]);
  const loadUsersResult = useLoadUsersWithError(data);

  return useLoadQueryMetadataWithError(data, loadUsersResult.data);
};

/**
 * Wrap useLoadUsers with error handling.
 * @param data
 */
function useLoadUsersWithError(data: SavedQueryBase[] | undefined) {
  const userUIDs = useMemo(() => data?.map((qt) => qt.user?.uid).filter((uid) => uid !== undefined), [data]);
  const loadUsersResult = useLoadUsers(userUIDs);

  useEffect(() => {
    if (loadUsersResult.error) {
      getAppEvents().publish({
        type: AppEvents.alertError.name,
        payload: [
          t('query-library.user-info.error', 'Error attempting to get user info from the library: {{error}}', {
            error: JSON.stringify(loadUsersResult.error),
          }),
        ],
      });
    }
  }, [loadUsersResult.error]);
  return loadUsersResult;
}

/**
 * Wrap useLoadQueryMetadata with error handling.
 * @param queryTemplates
 * @param userDataList
 */
function useLoadQueryMetadataWithError(
  queryTemplates: SavedQueryBase[] | undefined,
  userDataList: ReturnType<typeof useLoadUsers>['data']
) {
  const result = useLoadQueryMetadata(queryTemplates, userDataList);

  // useLoadQueryMetadata returns errors in the values so we filter and group them and later alert only one time for
  // all the errors. This way we show data that is loaded even if some rows errored out.
  // TODO: maybe we could show the rows with incomplete data to see exactly which ones errored out. I assume this
  //  can happen for example when data source for saved query was deleted. Would be nice if user would still be able
  //  to delete such row or decide what to do.
  const [values] = useMemo(() => {
    let errors: Error[] = [];
    let values = [];
    if (!result.value) {
      return [undefined, errors];
    } else if (!result.loading) {
      for (const value of result.value!) {
        if (value.error) {
          errors.push(value.error);
        } else {
          values.push(value);
        }
      }
    }
    return [values];
  }, [result]);

  // TODO: related to the TODO comment above, this is a temporary solution since we don't have a way to filter these queries
  //   in the backend yet

  // useEffect(() => {
  //   if (errors.length) {
  //     getAppEvents().publish({
  //       type: AppEvents.alertError.name,
  //       payload: [
  //         t('query-library.query-template.error', 'Error attempting to load query template metadata: {{error}}', {
  //           error: JSON.stringify(errors),
  //         }),
  //       ],
  //     });
  //   }
  // }, [errors]);

  return {
    loading: result.loading,
    error: result.error,
    value: values,
  };
}
