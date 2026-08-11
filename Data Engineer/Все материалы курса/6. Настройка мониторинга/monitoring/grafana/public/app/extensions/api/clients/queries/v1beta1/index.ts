import { t } from '@grafana/i18n';
import { handleError } from 'app/api/utils';
import { createSuccessNotification } from 'app/core/copy/appNotification';
import { notifyApp } from 'app/core/reducers/appNotification';

import { QUERY_LIBRARY_GET_LIMIT } from './baseAPI';
import { generatedAPI } from './endpoints.gen';

export const queriesAPIv1beta1 = generatedAPI.enhanceEndpoints({
  endpoints: {
    // Need to mutate the generated query to force query limit
    listQuery: (endpointDefinition) => {
      const originalQuery = endpointDefinition.query;
      if (originalQuery) {
        endpointDefinition.query = (requestOptions) =>
          originalQuery({
            ...requestOptions,
            limit: QUERY_LIBRARY_GET_LIMIT,
          });
      }
    },
    // Need to mutate the generated query to set the Content-Type header correctly
    updateQuery: (endpointDefinition) => {
      const originalQuery = endpointDefinition.query;
      if (originalQuery) {
        endpointDefinition.query = (requestOptions) => ({
          ...originalQuery(requestOptions),
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
        });
      }
      endpointDefinition.onQueryStarted = async (_, { queryFulfilled, dispatch }) => {
        try {
          await queryFulfilled;
          dispatch(
            notifyApp(
              createSuccessNotification(t('saved-queries.details.update-success', 'Query successfully updated'))
            )
          );
        } catch (e) {
          handleError(e, dispatch, t('saved-queries.details.update-error', 'Failed to update query'));
        }
      };
    },
    createQuery: (endpointDefinition) => {
      endpointDefinition.onQueryStarted = async (_, { queryFulfilled, dispatch }) => {
        try {
          // Update the cached list so the new query appears instantly
          const { data } = await queryFulfilled;
          dispatch(
            generatedAPI.util.updateQueryData('listQuery', {}, (list) => {
              list.items = [...(list.items || []), data];
            })
          );
          dispatch(
            notifyApp(
              createSuccessNotification(
                t('saved-queries.details.save-success', 'Query successfully saved to the library')
              )
            )
          );
        } catch (e) {
          handleError(e, dispatch, t('saved-queries.details.create-error', 'Failed to save query'));
        }
      };
    },
    deleteQuery: (endpointDefinition) => {
      endpointDefinition.onQueryStarted = async (_, { queryFulfilled, dispatch }) => {
        try {
          await queryFulfilled;
          dispatch(notifyApp(createSuccessNotification(t('saved-queries.details.delete-success', 'Query deleted'))));
        } catch (e) {
          handleError(e, dispatch, t('saved-queries.details.delete-error', 'Failed to delete query'));
        }
      };
    },
  },
});

export const { useCreateQueryMutation, useDeleteQueryMutation, useListQueryQuery, useUpdateQueryMutation } =
  queriesAPIv1beta1;

// eslint-disable-next-line no-barrel-files/no-barrel-files
export type { QuerySpec, Query, ListQueryApiResponse } from './endpoints.gen';
