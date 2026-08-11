import { render, waitFor } from 'test/test-utils';

import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { generatedAPI } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import { setupEnrichmentMockServer } from '../__mocks__/enrichmentApi';

setupEnrichmentMockServer();

import type { EnrichmentManageDrawerProps } from './EnrichmentManageDrawer';
import { EnrichmentPerRuleDrawer } from './EnrichmentPerRuleDrawer';

const mockManageDrawer: jest.Mock<null, [EnrichmentManageDrawerProps]> = jest.fn<null, [EnrichmentManageDrawerProps]>(
  () => null
);
jest.mock('./EnrichmentManageDrawer', () => ({
  EnrichmentManageDrawer: (props: EnrichmentManageDrawerProps) => {
    mockManageDrawer(props);
    return null;
  },
}));

beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
});

describe('EnrichmentPerRuleDrawer', () => {
  it('forwards fetched enrichments and ruleUid to EnrichmentManageDrawer', async () => {
    const onClose = jest.fn();
    render(<EnrichmentPerRuleDrawer ruleUid="dev123" onClose={onClose} />);

    await waitFor(() => {
      const lastCall = mockManageDrawer.mock.calls[mockManageDrawer.mock.calls.length - 1];
      const props = lastCall[0];
      expect(props.ruleUid).toBe('dev123');
      expect(props.onClose).toBe(onClose);
      expect(props.globalEnrichments).toMatchObject([{ metadata: { name: 'global-enrichment', uid: 'uid-global' } }]);
      expect(props.ruleLevelEnrichments).toMatchObject([
        { metadata: { name: 'rule-dev123-enrichment', uid: 'uid-rule-dev123' } },
      ]);
    });
  });
});
