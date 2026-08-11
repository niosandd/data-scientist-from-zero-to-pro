import { generatedAPI } from './endpoints.gen';
import type { PreviewEnrichmentRequestBody, PreviewEnrichmentResponse } from './previewTypes';

export const alertEnrichmentAPIv1beta1 = generatedAPI.enhanceEndpoints({}).injectEndpoints({
  endpoints: (build) => ({
    previewEnrichment: build.mutation<PreviewEnrichmentResponse, PreviewEnrichmentRequestBody>({
      query: (body) => ({
        url: '/enricher/preview',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListAlertEnrichmentQuery,
  useLazyListAlertEnrichmentQuery,
  useCreateAlertEnrichmentMutation,
  useDeleteAlertEnrichmentMutation,
  usePreviewEnrichmentMutation,
} = alertEnrichmentAPIv1beta1;

export type { PreviewEnrichmentRequestBody, PreviewEnrichmentResponse } from './previewTypes';
