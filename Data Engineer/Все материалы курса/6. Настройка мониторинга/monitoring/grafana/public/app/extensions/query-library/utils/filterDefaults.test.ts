// Mock UserStorage before importing the module
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@grafana/runtime/internal', () => ({
  UserStorage: jest.fn().mockImplementation(() => ({
    getItem: mockGetItem,
    setItem: mockSetItem,
  })),
}));

import { getStoredFilterDefaults, storeFilterDefaults } from './filterDefaults';

interface TestFilters {
  search: string;
  datasources: string[];
  starred: boolean;
}

describe('filterDefaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStoredFilterDefaults', () => {
    it('returns parsed filters when storage has a value', async () => {
      const stored: Partial<TestFilters> = { search: 'my query', starred: true };
      mockGetItem.mockResolvedValue(JSON.stringify(stored));

      const result = await getStoredFilterDefaults<TestFilters>('saved');

      // 'saved' uses the original un-suffixed key for backward compatibility.
      expect(mockGetItem).toHaveBeenCalledWith('filter-defaults');
      expect(result).toEqual(stored);
    });

    it('returns an empty object when storage is empty', async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await getStoredFilterDefaults<TestFilters>('recent');

      expect(result).toEqual({});
    });
  });

  describe('storeFilterDefaults', () => {
    it('serializes and writes filters to storage', async () => {
      const filters: Partial<TestFilters> = { datasources: ['prometheus'], starred: false };
      mockSetItem.mockResolvedValue(undefined);

      await storeFilterDefaults('saved', filters);

      // 'saved' uses the original un-suffixed key for backward compatibility.
      expect(mockSetItem).toHaveBeenCalledWith('filter-defaults', JSON.stringify(filters));
    });

    it('writes an empty object when no filters are set', async () => {
      mockSetItem.mockResolvedValue(undefined);

      await storeFilterDefaults('recent', {});

      expect(mockSetItem).toHaveBeenCalledWith('filter-defaults-recent', JSON.stringify({}));
    });
  });
});
