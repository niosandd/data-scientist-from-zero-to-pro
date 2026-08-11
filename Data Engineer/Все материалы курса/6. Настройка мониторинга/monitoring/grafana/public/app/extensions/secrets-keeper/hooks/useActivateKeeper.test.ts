import { renderHook, act } from 'test/test-utils';

import { generatedAPI } from 'app/extensions/api/clients/secret/v1beta1';

import { useActivateKeeper } from './useActivateKeeper';

jest.mock('app/extensions/api/clients/secret/v1beta1');

const mockUnwrap = jest.fn();
const mockActivateKeeper = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUseCreateKeeperActivateMutation = jest.mocked(generatedAPI.useCreateKeeperActivateMutation);

describe('useActivateKeeper', () => {
  beforeEach(() => {
    // RTK's mutation tuple includes a complex result object; the hook only
    // reads `isLoading`, so partial-cast the second element. Using
    // `jest.mocked` on the outer mutation hook gives signature-drift safety
    // on the trigger/result shape returned to callers.
    mockUseCreateKeeperActivateMutation.mockReturnValue([
      mockActivateKeeper,
      { isLoading: false, reset: jest.fn() },
    ] as unknown as ReturnType<typeof generatedAPI.useCreateKeeperActivateMutation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the activate mutation with the keeper name and an empty body', async () => {
    mockUnwrap.mockResolvedValue(undefined);

    const { result } = renderHook(() => useActivateKeeper());

    await act(async () => {
      await result.current.activateKeeper('my-aws-keeper');
    });

    expect(mockActivateKeeper).toHaveBeenCalledWith({
      name: 'my-aws-keeper',
      keeper: {},
    });
  });

  it('accepts the system keeper name for deactivation', async () => {
    mockUnwrap.mockResolvedValue(undefined);

    const { result } = renderHook(() => useActivateKeeper());

    await act(async () => {
      await result.current.activateKeeper('system');
    });

    expect(mockActivateKeeper).toHaveBeenCalledWith({
      name: 'system',
      keeper: {},
    });
  });

  it('rejects when unwrap() rejects', async () => {
    mockUnwrap.mockRejectedValue(new Error('Keeper not found'));
    const { result } = renderHook(() => useActivateKeeper());

    await expect(result.current.activateKeeper('missing-keeper')).rejects.toThrow('Keeper not found');
  });

  it('returns loading state', () => {
    mockUseCreateKeeperActivateMutation.mockReturnValue([
      mockActivateKeeper,
      { isLoading: true, reset: jest.fn() },
    ] as unknown as ReturnType<typeof generatedAPI.useCreateKeeperActivateMutation>);

    const { result } = renderHook(() => useActivateKeeper());
    expect(result.current.isLoading).toBe(true);
  });
});
