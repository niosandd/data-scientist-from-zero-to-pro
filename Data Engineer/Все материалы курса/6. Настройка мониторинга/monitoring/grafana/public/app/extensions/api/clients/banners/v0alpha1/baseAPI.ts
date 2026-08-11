import { createApi } from '@reduxjs/toolkit/query/react';

import { createBaseQuery } from '@grafana/api-clients/rtkq';
import { getAPIBaseURL } from 'app/api/utils';

const BASE_URL = getAPIBaseURL('banners.grafana.app', 'v0alpha1');

export const api = createApi({
  reducerPath: 'announcementBannerAPIv0alpha1',
  baseQuery: createBaseQuery({
    baseURL: BASE_URL,
  }),
  tagTypes: ['AnnouncementBannerList'],
  endpoints: () => ({}),
});
