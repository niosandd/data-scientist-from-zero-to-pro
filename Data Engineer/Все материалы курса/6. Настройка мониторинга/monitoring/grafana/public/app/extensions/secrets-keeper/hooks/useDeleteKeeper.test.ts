import { renderHook, act } from 'test/test-utils';

import { useDeleteKeeper } from './useDeleteKeeper';

const mockUnwrap = jest.fn();
const mockDeleteKeeper = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUseDeleteKeeperMutation = jest
  .fn()
  .mockReturnValue([mockDeleteKeeper, { isLoading: false, error: undefined }]);

jest.mock('app/extensions/api/clients/secret/v1beta1', () => ({
  generatedAPI: {
    useDeleteKeeperMutation: (...args: unknown[]) => mockUseDeleteKeeperMutation(...args),
  },
}));

describe('useDeleteKeeper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the delete mutation with the keeper name', async () => {
    mockUnwrap.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteKeeper());

    await act(async () => {
      await result.current.deleteKeeper('my-aws-keeper');
    });

    expect(mockDeleteKeeper).toHaveBeenCalledWith({ name: 'my-aws-keeper' });
  });

  it('rejects when unwrap() rejects', async () => {
    mockUnwrap.mockRejectedValue(new Error('Keeper not found'));
    const { result } = renderHook(() => useDeleteKeeper());

    await expect(result.current.deleteKeeper('missing-keeper')).rejects.toThrow('Keeper not found');
  });

  it('returns loading state', () => {
    mockUseDeleteKeeperMutation.mockReturnValue([mockDeleteKeeper, { isLoading: true, error: undefined }]);

    const { result } = renderHook(() => useDeleteKeeper());
    expect(result.current.isLoading).toBe(true);
  });
});
