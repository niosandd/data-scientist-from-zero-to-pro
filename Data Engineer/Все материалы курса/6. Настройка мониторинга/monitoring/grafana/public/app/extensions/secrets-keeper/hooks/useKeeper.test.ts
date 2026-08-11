import { renderHook } from 'test/test-utils';

import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { useKeeper } from './useKeeper';

const mockKeeper: Keeper = {
  metadata: { name: 'aws-prod', resourceVersion: 'rv-1' },
  spec: { description: 'Test', aws: { region: 'us-east-1' } },
  status: {},
} as Keeper;

const mockUseGetKeeperQuery = jest.fn().mockReturnValue({
  data: mockKeeper,
  isLoading: false,
  error: undefined,
});

jest.mock('app/extensions/api/clients/secret/v1beta1', () => ({
  generatedAPI: {
    useGetKeeperQuery: (...args: unknown[]) => mockUseGetKeeperQuery(...args),
  },
}));

describe('useKeeper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes name to the query', () => {
    renderHook(() => useKeeper('aws-prod'));
    expect(mockUseGetKeeperQuery).toHaveBeenCalledWith({ name: 'aws-prod' });
  });

  it('returns keeper data', () => {
    const { result } = renderHook(() => useKeeper('aws-prod'));
    expect(result.current.keeper).toBe(mockKeeper);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('returns loading state', () => {
    mockUseGetKeeperQuery.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    const { result } = renderHook(() => useKeeper('aws-prod'));
    expect(result.current.keeper).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state', () => {
    const mockError = { status: 404, data: { message: 'Not found' } };
    mockUseGetKeeperQuery.mockReturnValue({ data: undefined, isLoading: false, error: mockError });

    const { result } = renderHook(() => useKeeper('missing'));
    expect(result.current.error).toBe(mockError);
    expect(result.current.keeper).toBeUndefined();
  });
});
