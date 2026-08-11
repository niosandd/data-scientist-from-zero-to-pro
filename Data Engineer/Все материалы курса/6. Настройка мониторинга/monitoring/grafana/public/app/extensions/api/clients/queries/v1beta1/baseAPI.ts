import { createApi } from '@reduxjs/toolkit/query/react';

import { createBaseQuery } from '@grafana/api-clients/rtkq';
import { getAPIBaseURL } from 'app/api/utils';

// Currently, we are loading all query templates
// Organizations can have maximum of 20000 query templates
export const QUERY_LIBRARY_GET_LIMIT = 20000;

const BASE_URL = getAPIBaseURL('queries.grafana.app', 'v1beta1');

export const api = createApi({
  reducerPath: 'queriesAPIv1beta1',
  baseQuery: createBaseQuery({
    baseURL: BASE_URL,
  }),
  endpoints: () => ({}),
});
