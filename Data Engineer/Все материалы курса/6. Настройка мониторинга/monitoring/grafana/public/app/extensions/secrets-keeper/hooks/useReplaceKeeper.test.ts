import { renderHook, act } from 'test/test-utils';

import { awsFormValues } from '../test-fixtures';
import { formValuesToKeeper } from '../utils';

import { useReplaceKeeper } from './useReplaceKeeper';

const mockUnwrap = jest.fn();
const mockReplaceKeeper = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUseReplaceKeeperMutation = jest
  .fn()
  .mockReturnValue([mockReplaceKeeper, { isLoading: false, error: undefined }]);

jest.mock('app/extensions/api/clients/secret/v1beta1', () => ({
  generatedAPI: {
    useReplaceKeeperMutation: (...args: unknown[]) => mockUseReplaceKeeperMutation(...args),
  },
}));

describe('useReplaceKeeper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes keeper with resourceVersion to the mutation', async () => {
    const mockKeeper = { metadata: { name: 'my-aws-keeper' }, spec: {}, status: {} };
    mockUnwrap.mockResolvedValue(mockKeeper);

    const { result } = renderHook(() => useReplaceKeeper());

    await act(async () => {
      await result.current.replaceKeeper(awsFormValues, 'my-aws-keeper', 'rv-123');
    });

    const expectedKeeper = formValuesToKeeper(awsFormValues)!;
    expectedKeeper.metadata.name = 'my-aws-keeper';
    expectedKeeper.metadata.resourceVersion = 'rv-123';

    expect(mockReplaceKeeper).toHaveBeenCalledWith({
      name: 'my-aws-keeper',
      keeper: expectedKeeper,
    });
  });

  it('rejects when unwrap() rejects', async () => {
    mockUnwrap.mockRejectedValue(new Error('Conflict'));
    const { result } = renderHook(() => useReplaceKeeper());

    await expect(result.current.replaceKeeper(awsFormValues, 'my-aws-keeper', 'rv-123')).rejects.toThrow('Conflict');
  });

  it('returns loading state', () => {
    mockUseReplaceKeeperMutation.mockReturnValue([mockReplaceKeeper, { isLoading: true, error: undefined }]);

    const { result } = renderHook(() => useReplaceKeeper());
    expect(result.current.isLoading).toBe(true);
  });
});
