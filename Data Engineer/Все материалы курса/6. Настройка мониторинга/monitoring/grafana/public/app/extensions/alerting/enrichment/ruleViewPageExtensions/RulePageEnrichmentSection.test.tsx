import { render, waitFor, act } from 'test/test-utils';

import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { generatedAPI } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import { setupEnrichmentMockServer } from '../__mocks__/enrichmentApi';
import type { EnrichmentUnifiedViewProps } from '../ruleListExtensions/EnrichmentUnifiedView';

import { RulePageEnrichmentSection } from './EnrichmentTab';

setupEnrichmentMockServer();
const mockUnifiedView: jest.Mock<null, [EnrichmentUnifiedViewProps]> = jest.fn<null, [EnrichmentUnifiedViewProps]>(
  () => null
);
jest.mock('../ruleListExtensions/EnrichmentUnifiedView', () => ({
  EnrichmentUnifiedView: (props: EnrichmentUnifiedViewProps) => {
    mockUnifiedView(props);
    return null;
  },
}));

beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
});

describe('RulePageEnrichmentSection', () => {
  it('forwards fetched enrichments and ruleUid to EnrichmentUnifiedView and wires refetch callbacks', async () => {
    render(<RulePageEnrichmentSection ruleUid="dev123" />);

    await waitFor(() => {
      const lastCall = mockUnifiedView.mock.calls[mockUnifiedView.mock.calls.length - 1];
      const props = lastCall[0];
      expect(props.ruleUid).toBe('dev123');
      expect(props.globalEnrichments).toMatchObject([{ metadata: { name: 'global-enrichment', uid: 'uid-global' } }]);
      expect(props.ruleLevelEnrichments).toMatchObject([
        { metadata: { name: 'rule-dev123-enrichment', uid: 'uid-rule-dev123' } },
      ]);
    });

    const last = mockUnifiedView.mock.calls[mockUnifiedView.mock.calls.length - 1][0];
    await act(async () => {
      await last.onDeleteEnrichment('any');
      await last.onEnrichmentCreated?.();
      await last.onEnrichmentUpdated?.();
    });
  });
});
