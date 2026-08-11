import { createApi } from '@reduxjs/toolkit/query/react';

import { getAPIBaseURL } from '@grafana/api-clients';
import { createBaseQuery } from '@grafana/api-clients/rtkq';

export const API_GROUP = 'secret.grafana.app' as const;
export const API_VERSION = 'v1beta1' as const;
export const BASE_URL = getAPIBaseURL(API_GROUP, API_VERSION);

export const api = createApi({
  reducerPath: 'secretAPIv1beta1',
  baseQuery: createBaseQuery({
    baseURL: BASE_URL,
  }),
  endpoints: () => ({}),
});
