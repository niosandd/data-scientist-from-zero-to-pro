import { renderHook, act } from 'test/test-utils';

import { awsFormValues } from '../test-fixtures';
import { formValuesToKeeper } from '../utils';

import { useCreateKeeper } from './useCreateKeeper';

const mockUnwrap = jest.fn();
const mockCreateKeeper = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUseCreateKeeperMutation = jest
  .fn()
  .mockReturnValue([mockCreateKeeper, { isLoading: false, error: undefined }]);

jest.mock('app/extensions/api/clients/secret/v1beta1', () => ({
  generatedAPI: {
    useCreateKeeperMutation: (...args: unknown[]) => mockUseCreateKeeperMutation(...args),
  },
}));

describe('useCreateKeeper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes formValuesToKeeper result to the mutation', async () => {
    const mockKeeper = { metadata: { name: 'my-aws-keeper' }, spec: {}, status: {} };
    mockUnwrap.mockResolvedValue(mockKeeper);

    const { result } = renderHook(() => useCreateKeeper());

    await act(async () => {
      await result.current.createKeeper(awsFormValues);
    });

    expect(mockCreateKeeper).toHaveBeenCalledWith({
      keeper: formValuesToKeeper(awsFormValues),
    });
  });

  it('rejects when unwrap() rejects', async () => {
    mockUnwrap.mockRejectedValue(new Error('Conflict'));
    const { result } = renderHook(() => useCreateKeeper());

    await expect(result.current.createKeeper(awsFormValues)).rejects.toThrow('Conflict');
  });

  it('returns loading state', () => {
    mockUseCreateKeeperMutation.mockReturnValue([mockCreateKeeper, { isLoading: true, error: undefined }]);

    const { result } = renderHook(() => useCreateKeeper());
    expect(result.current.isLoading).toBe(true);
  });
});
