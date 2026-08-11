import { skipToken } from '@reduxjs/toolkit/query';
import { renderHook } from '@testing-library/react';

import { useLoadUsers } from './dataFetching';

const mockUseGetDisplayMappingQuery = jest.fn();

jest.mock('app/api/clients/iam/v0alpha1', () => ({
  useGetDisplayMappingQuery: (arg: unknown) => mockUseGetDisplayMappingQuery(arg),
}));

describe('useLoadUsers', () => {
  beforeEach(() => {
    mockUseGetDisplayMappingQuery.mockClear();
  });

  it('skips the request when no user UIDs are provided', () => {
    // Empty saved-queries state: the display-mapping endpoint 400s on an empty key list, so the
    // request must be skipped rather than fired.
    renderHook(() => useLoadUsers([]));
    expect(mockUseGetDisplayMappingQuery).toHaveBeenCalledWith(skipToken);
  });

  it('skips the request when userUIDs is undefined', () => {
    renderHook(() => useLoadUsers(undefined));
    expect(mockUseGetDisplayMappingQuery).toHaveBeenCalledWith(skipToken);
  });

  it('skips the request when every UID is falsy', () => {
    renderHook(() => useLoadUsers([undefined, '', undefined] as unknown as string[]));
    expect(mockUseGetDisplayMappingQuery).toHaveBeenCalledWith(skipToken);
  });

  it('requests the display mapping with the deduped, compacted key list when UIDs exist', () => {
    renderHook(() => useLoadUsers(['user:1', 'user:2', 'user:1', '']));
    expect(mockUseGetDisplayMappingQuery).toHaveBeenCalledWith({ key: ['user:1', 'user:2'] });
  });
});
