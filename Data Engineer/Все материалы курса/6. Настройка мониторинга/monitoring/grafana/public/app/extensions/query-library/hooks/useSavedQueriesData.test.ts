import { act, renderHook, waitFor } from '@testing-library/react';

import { useListQueryQuery } from 'app/extensions/api/clients/queries/v1beta1';

import { QueryLibraryTab } from '../types';
import { useGetNewSavedQuery } from '../utils/dataFetching';
import { getUserStorageFavorites } from '../utils/favorites';
import { getStoredFilterDefaults, storeFilterDefaults } from '../utils/filterDefaults';
import { convertToMapTagCount } from '../utils/mappers';
import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { useGetSavedQueries } from './useGetSavedQueries';
import { useSavedQueriesData } from './useSavedQueriesData';

jest.mock('app/extensions/api/clients/queries/v1beta1', () => ({
  useListQueryQuery: jest.fn(),
}));

jest.mock('./useGetSavedQueries', () => ({
  useGetSavedQueries: jest.fn(),
}));

jest.mock('../utils/dataFetching', () => ({
  useGetNewSavedQuery: jest.fn(),
}));

jest.mock('../utils/filterDefaults', () => ({
  getStoredFilterDefaults: jest.fn(),
  storeFilterDefaults: jest.fn(),
}));

jest.mock('../utils/favorites', () => ({
  getUserStorageFavorites: jest.fn(),
}));

jest.mock('../utils/search', () => ({
  searchQueryLibrary: jest.fn((queries: unknown[]) => queries),
}));

jest.mock('../utils/mappers', () => ({
  convertToMapTagCount: jest.fn(),
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: { user: { uid: '99' } },
}));

let mockContext = { ...mockQueryLibraryContext };

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => mockContext,
}));

const mockSavedQuery2 = { ...mockSavedQuery, uid: '1', datasourceName: 'loki', user: { uid: 'viewer:Other' } };

/** Renders the hook and flushes all pending useAsync promise resolutions. */
const renderAndSettle = async () => {
  const result = renderHook(() => useSavedQueriesData());
  await act(async () => {});
  return result;
};

describe('useSavedQueriesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      ...mockQueryLibraryContext,
      activeTab: QueryLibraryTab.ALL,
      newQuery: undefined,
      activeDatasources: [],
      userFavorites: {},
    };
    (useListQueryQuery as jest.Mock).mockReturnValue({ data: undefined, error: undefined });
    (useGetSavedQueries as jest.Mock).mockReturnValue({ value: [mockSavedQuery], loading: false });
    (useGetNewSavedQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });
    (getStoredFilterDefaults as jest.Mock).mockResolvedValue(undefined);
    (getUserStorageFavorites as jest.Mock).mockResolvedValue({});
    (convertToMapTagCount as jest.Mock).mockReturnValue([{ term: 'tag1', count: 1 }]);
  });

  it('returns isLoading=true when savedQueries is undefined', async () => {
    (useGetSavedQueries as jest.Mock).mockReturnValue({ value: undefined, loading: true });
    const { result } = await renderAndSettle();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading=false when savedQueries are loaded', async () => {
    const { result } = await renderAndSettle();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns default filter state on first render', async () => {
    const { result } = await renderAndSettle();
    expect(result.current.filters.showStarredOnly).toBe(false);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.datasourceFilters).toEqual([]);
    expect(result.current.filters.userFilters).toEqual([]);
    expect(result.current.filters.tagFilters).toEqual([]);
    expect(result.current.filters.rememberFilters).toBe(false);
  });

  it('setFilters merges partial updates without replacing other fields', async () => {
    const { result } = await renderAndSettle();
    act(() => result.current.setFilters({ searchQuery: 'hello' }));
    expect(result.current.filters.searchQuery).toBe('hello');
    expect(result.current.filters.showStarredOnly).toBe(false);
  });

  it('showStarredOnly filters out non-favorited queries', async () => {
    mockContext.userFavorites = { [mockSavedQuery.uid!]: true };
    (useGetSavedQueries as jest.Mock).mockReturnValue({
      value: [mockSavedQuery, mockSavedQuery2],
      loading: false,
    });
    const { result } = await renderAndSettle();
    act(() => result.current.setFilters({ showStarredOnly: true }));
    expect(result.current.queryRows).toHaveLength(1);
  });

  it('returns availableDatasources as unique datasource names from saved queries', async () => {
    (useGetSavedQueries as jest.Mock).mockReturnValue({
      value: [mockSavedQuery, mockSavedQuery2, mockSavedQuery],
      loading: false,
    });
    const { result } = await renderAndSettle();
    expect(result.current.availableDatasources).toEqual(['prometheus', 'loki']);
  });

  it('returns availableUsers as unique users from saved queries', async () => {
    (useGetSavedQueries as jest.Mock).mockReturnValue({
      value: [mockSavedQuery, mockSavedQuery2, mockSavedQuery],
      loading: false,
    });
    const { result } = await renderAndSettle();
    const uids = result.current.availableUsers.map((u) => u.uid);
    expect(uids).toHaveLength(2);
    expect(uids).toContain(mockSavedQuery.user!.uid);
    expect(uids).toContain('viewer:Other');
  });

  it('returns isUsingHistory=false (Recent tab not yet implemented)', async () => {
    mockContext.activeTab = QueryLibraryTab.RECENT;
    const { result } = await renderAndSettle();
    // fetchQueryHistory is commented out until the Recent tab is re-introduced
    expect(result.current.isUsingHistory).toBe(false);
  });

  it('restores stored filter defaults when rememberFilters was true', async () => {
    (getStoredFilterDefaults as jest.Mock).mockResolvedValue({
      rememberFilters: true,
      searchQuery: 'stored-query',
    });
    const { result } = renderHook(() => useSavedQueriesData());
    await waitFor(() => expect(result.current.filters.searchQuery).toBe('stored-query'));
  });

  it('does not restore stored defaults when rememberFilters was false', async () => {
    (getStoredFilterDefaults as jest.Mock).mockResolvedValue({
      rememberFilters: false,
      searchQuery: 'stored-query',
    });
    const { result } = await renderAndSettle();
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('calls storeFilterDefaults on unmount when rememberFilters is on', async () => {
    const { result, unmount } = await renderAndSettle();
    act(() => result.current.setFilters({ rememberFilters: true }));
    unmount();
    expect(storeFilterDefaults).toHaveBeenCalledWith('saved', expect.objectContaining({ rememberFilters: true }));
  });

  it('clears stored defaults when rememberFilters is turned off', async () => {
    const { result } = await renderAndSettle();
    act(() => result.current.setFilters({ rememberFilters: true }));
    act(() => result.current.setFilters({ rememberFilters: false }));
    expect(storeFilterDefaults).toHaveBeenCalledWith('saved', {});
  });

  it('seeds userFavorites from UserStorage on mount', async () => {
    const mockSetUserFavorites = jest.fn();
    mockContext = { ...mockContext, setUserFavorites: mockSetUserFavorites };
    (getUserStorageFavorites as jest.Mock).mockResolvedValue({ [mockSavedQuery.uid!]: true });
    await renderAndSettle();
    expect(mockSetUserFavorites).toHaveBeenCalledWith(expect.any(Function));
    // Invoke the updater to verify it merges stored favorites with current context values
    const updater = mockSetUserFavorites.mock.calls[0][0];
    expect(updater({})).toEqual({ [mockSavedQuery.uid!]: true });
  });

  it('getTagOptions calls convertToMapTagCount and returns the result', async () => {
    const { result } = await renderAndSettle();
    const tags = await result.current.getTagOptions();
    expect(convertToMapTagCount).toHaveBeenCalled();
    expect(tags).toEqual([{ term: 'tag1', count: 1 }]);
  });
});
