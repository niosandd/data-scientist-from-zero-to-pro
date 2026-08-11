import { render, screen } from '@testing-library/react';

import { type SavedQueriesFilterState } from '../hooks/useSavedQueriesData';
import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueriesLayout } from './SavedQueriesLayout';

jest.mock('./SavedQueriesFilters', () => ({
  SavedQueriesFilters: jest.fn(() => <div data-testid="filters" />),
}));

jest.mock('./SavedQueriesLibrary', () => ({
  SavedQueriesLibrary: jest.fn(() => <div data-testid="library" />),
}));

const defaultFilters: SavedQueriesFilterState = {
  showStarredOnly: false,
  searchQuery: '',
  datasourceFilters: [],
  userFilters: [],
  tagFilters: [],
  sortingOption: {},
  rememberFilters: false,
};

const mockSetFilters = jest.fn();
const mockGetTagOptions = jest.fn().mockResolvedValue([]);

let mockDataHook = {
  queryRows: [mockSavedQuery],
  newQuery: undefined as typeof mockSavedQuery | undefined,
  isLoading: false,
  isNewQueryError: false,
  error: undefined as unknown,
  isUsingHistory: false,
  availableDatasources: ['prometheus'],
  availableUsers: [mockSavedQuery.user!],
  getTagOptions: mockGetTagOptions,
  filters: defaultFilters,
  setFilters: mockSetFilters,
};

jest.mock('../hooks/useSavedQueriesData', () => ({
  useSavedQueriesData: () => mockDataHook,
}));

let mockIsEditingQuery = false;

jest.mock('../../../features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    isEditingQuery: mockIsEditingQuery,
  }),
}));

describe('SavedQueriesLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEditingQuery = false;
    mockDataHook = {
      queryRows: [mockSavedQuery],
      newQuery: undefined,
      isLoading: false,
      isNewQueryError: false,
      error: undefined,
      isUsingHistory: false,
      availableDatasources: ['prometheus'],
      availableUsers: [mockSavedQuery.user!],
      getTagOptions: mockGetTagOptions,
      filters: defaultFilters,
      setFilters: mockSetFilters,
    };
  });

  it('renders filters and library side by side', () => {
    render(<SavedQueriesLayout />);
    expect(screen.getByTestId('filters')).toBeInTheDocument();
    expect(screen.getByTestId('library')).toBeInTheDocument();
  });

  it('shows error state when error is set', () => {
    mockDataHook.error = new Error('Network failure');
    render(<SavedQueriesLayout />);
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(screen.queryByTestId('filters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('library')).not.toBeInTheDocument();
  });

  it('shows error state when isNewQueryError is true', () => {
    mockDataHook.isNewQueryError = true;
    render(<SavedQueriesLayout />);
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });

  it('shows error message for Error instances', () => {
    mockDataHook.error = new Error('Something specific failed');
    render(<SavedQueriesLayout />);
    expect(screen.getByText('Something specific failed')).toBeInTheDocument();
  });

  it('does not show error message for non-Error error values', () => {
    mockDataHook.error = 'string error';
    render(<SavedQueriesLayout />);
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(screen.queryByText('string error')).not.toBeInTheDocument();
  });
});
