import { createApi } from '@reduxjs/toolkit/query/react';

import { createBaseQuery } from '@grafana/api-clients/rtkq';
import { getAPIBaseURL } from 'app/api/utils';

const BASE_URL = getAPIBaseURL('alertenrichment.grafana.app', 'v1beta1');

export const api = createApi({
  reducerPath: 'alertEnrichmentAPIv1beta1',
  baseQuery: createBaseQuery({
    baseURL: BASE_URL,
  }),
  tagTypes: ['AlertEnrichmentList'],
  endpoints: () => ({}),
});
