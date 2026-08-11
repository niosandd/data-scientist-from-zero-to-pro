import { within } from '@testing-library/react';
import { render, screen } from 'test/test-utils';

import { type SavedQueriesFilterState } from '../hooks/useSavedQueriesData';
import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueriesFilters } from './SavedQueriesFilters';

// Mock complex controls so tests can trigger onChange without deep UI interaction.
// These have their own tests or are third-party; here we only care about callback wiring.
jest.mock('../../../core/components/Select/SortPicker', () => ({
  SortPicker: jest.fn(({ onChange }) => (
    <button data-testid="sort-picker" onClick={() => onChange({ value: 'alpha-asc', label: 'A–Z' })} />
  )),
}));

jest.mock('../../../core/components/TagFilter/TagFilter', () => ({
  TagFilter: jest.fn(({ onChange }) => <button data-testid="tag-filter" onClick={() => onChange(['newtag'])} />),
}));

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  MultiCombobox: jest.fn(({ id, onChange }) => (
    <button data-testid={`multi-combobox-${id}`} onClick={() => onChange([{ value: 'test-val' }])} />
  )),
}));

const mockTriggerAnalyticsEvent = jest.fn();
const mockSetFilters = jest.fn();

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    triggerAnalyticsEvent: mockTriggerAnalyticsEvent,
  }),
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

const defaultProps = {
  filters: defaultFilters,
  setFilters: mockSetFilters,
  availableDatasources: ['prometheus', 'loki'],
  availableUsers: [mockSavedQuery.user!],
  getTagOptions: jest.fn().mockResolvedValue([]),
};

describe('SavedQueriesFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Filters region landmark', () => {
    render(<SavedQueriesFilters {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
  });

  it('renders all section labels', () => {
    render(<SavedQueriesFilters {...defaultProps} />);
    const filtersRegion = screen.getByRole('region', { name: 'Filters' });
    expect(within(filtersRegion).getAllByText('Starred queries').length).toBeGreaterThan(0);
    expect(within(filtersRegion).getByText('Search')).toBeInTheDocument();
    expect(within(filtersRegion).getByText('Author')).toBeInTheDocument();
    expect(within(filtersRegion).getByText('Data source name')).toBeInTheDocument();
    expect(within(filtersRegion).getByText('Tags')).toBeInTheDocument();
    expect(within(filtersRegion).getByText('Sort')).toBeInTheDocument();
    expect(within(filtersRegion).getByText('Remember filters')).toBeInTheDocument();
  });

  it('calls setFilters with showStarredOnly true when Starred option is selected', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.click(screen.getByRole('radio', { name: 'Starred queries' }));
    expect(mockSetFilters).toHaveBeenCalledWith({ showStarredOnly: true });
  });

  it('calls setFilters with showStarredOnly false when All queries option is selected', async () => {
    const { user } = render(
      <SavedQueriesFilters {...defaultProps} filters={{ ...defaultFilters, showStarredOnly: true }} />
    );
    await user.click(screen.getByRole('radio', { name: 'All queries' }));
    expect(mockSetFilters).toHaveBeenCalledWith({ showStarredOnly: false });
  });

  it('calls setFilters with searchQuery when search input changes', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    // FilterInput is controlled (value="" doesn't update between keystrokes in tests),
    // so onChange receives one character at a time — type a single char and assert.
    await user.type(screen.getByPlaceholderText('Search by...'), 'h');
    expect(mockSetFilters).toHaveBeenCalledWith({ searchQuery: 'h' });
  });

  // FilterInput defaults to escapeRegex=true, which would turn '-' into '\-'
  // and break the downstream .includes() match.
  it('passes regex special characters through unescaped', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.type(screen.getByPlaceholderText('Search by...'), '-');
    expect(mockSetFilters).toHaveBeenCalledWith({ searchQuery: '-' });
  });

  it('calls setFilters with userFilters when author filter changes', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.click(screen.getByTestId('multi-combobox-saved-queries-author-filter'));
    expect(mockSetFilters).toHaveBeenCalledWith({ userFilters: ['test-val'] });
  });

  it('calls setFilters with datasourceFilters when datasource filter changes', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.click(screen.getByTestId('multi-combobox-saved-queries-datasource-filter'));
    expect(mockSetFilters).toHaveBeenCalledWith({ datasourceFilters: ['test-val'] });
  });

  it('calls setFilters with tagFilters when tag filter changes', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.click(screen.getByTestId('tag-filter'));
    expect(mockSetFilters).toHaveBeenCalledWith({ tagFilters: ['newtag'] });
  });

  it('calls setFilters with sortingOption when sort changes', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    await user.click(screen.getByTestId('sort-picker'));
    expect(mockSetFilters).toHaveBeenCalledWith({ sortingOption: { value: 'alpha-asc', label: 'A–Z' } });
  });

  it('calls setFilters with rememberFilters true when toggle is clicked', async () => {
    const { user } = render(<SavedQueriesFilters {...defaultProps} />);
    // getByLabelText avoids a jsdom getComputedStyle issue with role="switch" + name filter
    await user.click(screen.getByLabelText('Remember filters'));
    expect(mockSetFilters).toHaveBeenCalledWith({ rememberFilters: true });
  });

  it('disables radio buttons when disabled prop is true', () => {
    render(<SavedQueriesFilters {...defaultProps} disabled />);
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it('disables the search input when disabled prop is true', () => {
    render(<SavedQueriesFilters {...defaultProps} disabled />);
    expect(screen.getByPlaceholderText('Search by...')).toBeDisabled();
  });

  it('disables the remember-filters toggle when disabled prop is true', () => {
    render(<SavedQueriesFilters {...defaultProps} disabled />);
    expect(screen.getByRole('switch', { name: 'Remember filters' })).toBeDisabled();
  });
});
