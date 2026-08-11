import { renderHook } from '@testing-library/react';

import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { useKeepers } from './useKeepers';

const mockUseListKeeperQuery = jest.fn();

jest.mock('app/extensions/api/clients/secret/v1beta1', () => ({
  generatedAPI: {
    useListKeeperQuery: (...args: unknown[]) => mockUseListKeeperQuery(...args),
  },
}));

const createMockApiKeeper = (name: string, spec: Keeper['spec'], creationTimestamp = '2025-01-01T00:00:00Z'): Keeper =>
  ({
    metadata: { name, creationTimestamp },
    spec,
    status: { active: false },
  }) as Keeper;

describe('useKeepers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.keepers).toEqual([]);
  });

  it('returns keepers sorted by name', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: {
        items: [
          createMockApiKeeper('zebra-keeper', { description: 'Last', aws: { region: 'us-east-1' } }),
          createMockApiKeeper('alpha-keeper', { description: 'First', aws: { region: 'eu-west-1' } }),
        ],
      },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.keepers.map((k) => k.name)).toEqual(['alpha-keeper', 'zebra-keeper']);
  });

  it('transforms API Keeper to KeeperListItem correctly', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: {
        items: [
          createMockApiKeeper('aws-prod', {
            description: 'Production AWS',
            aws: { region: 'us-east-1' },
          }),
        ],
      },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    const keeper = result.current.keepers[0];
    expect(keeper).toEqual({
      name: 'aws-prod',
      type: 'aws',
      description: 'Production AWS',
      isActive: false,
      createdAt: '2025-01-01T00:00:00Z',
      config: 'us-east-1',
      status: undefined,
    });
  });

  it('surfaces the keeper whose status.active is true as activeKeeper', () => {
    const activeKeeper: Keeper = {
      metadata: { name: 'alpha-keeper', creationTimestamp: '2025-01-01T00:00:00Z' },
      spec: { description: 'First', aws: { region: 'eu-west-1' } },
      status: { active: true },
    } as unknown as Keeper;
    mockUseListKeeperQuery.mockReturnValue({
      data: {
        items: [
          createMockApiKeeper('beta-keeper', { description: 'Second', aws: { region: 'us-west-2' } }),
          activeKeeper,
        ],
      },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());

    expect(result.current.activeKeeper?.name).toBe('alpha-keeper');
    const actives = result.current.keepers.filter((k) => k.isActive);
    expect(actives).toHaveLength(1);
    expect(actives[0].name).toBe('alpha-keeper');
  });

  it('returns activeKeeper undefined when no keeper has status.active set', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: {
        items: [
          createMockApiKeeper('alpha-keeper', { description: 'First', aws: { region: 'eu-west-1' } }),
          createMockApiKeeper('beta-keeper', { description: 'Second', aws: { region: 'us-west-2' } }),
        ],
      },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());

    expect(result.current.activeKeeper).toBeUndefined();
    expect(result.current.keepers.every((k) => !k.isActive)).toBe(true);
  });

  it('handles API error with message in data', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: { message: 'Internal Server Error' } },
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Internal Server Error');
    expect(result.current.keepers).toEqual([]);
  });

  it('handles API error with message property', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Network request failed' },
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network request failed');
  });

  it('handles empty list', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.keepers).toEqual([]);
    expect(result.current.activeKeeper).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('returns undefined error on success', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.error).toBeUndefined();
  });

  it('handles malformed data without items key', () => {
    mockUseListKeeperQuery.mockReturnValue({
      data: {},
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.keepers).toEqual([]);
    expect(result.current.activeKeeper).toBeUndefined();
  });

  it('handles FETCH_ERROR shape from RTK Query', () => {
    // RTK Query returns this shape for network failures
    mockUseListKeeperQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' },
    });

    const { result } = renderHook(() => useKeepers());
    expect(result.current.error).toBeInstanceOf(Error);
    // extractErrorMessage falls through to String(error) for this shape
    expect(result.current.error?.message).toBeTruthy();
  });
});
