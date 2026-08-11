import { render, screen } from 'test/test-utils';

import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';
import { useDatasource } from '../utils/useDatasource';

import { SavedQueryCard } from './SavedQueryCard';

jest.mock('../utils/useDatasource', () => ({
  useDatasource: jest.fn(),
}));

const mockUseDatasource = useDatasource as jest.MockedFunction<typeof useDatasource>;
mockUseDatasource.mockReturnValue({
  value: {
    meta: { info: { logos: { small: 'foo/icn-prometheus.svg' } } },
    type: 'prometheus',
  } as any,
  loading: false,
});

const mockOnFavorite = jest.fn();
const mockOnUnfavorite = jest.fn();

let mockContext = {
  ...mockQueryLibraryContext,
  onFavorite: mockOnFavorite,
  onUnfavorite: mockOnUnfavorite,
  userFavorites: {} as Record<string, boolean>,
  highlightedQuery: undefined as string | undefined,
};

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => mockContext,
}));

describe('SavedQueryCard', () => {
  const defaultProps = {
    queryRow: mockSavedQuery,
    isSelected: false,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      ...mockQueryLibraryContext,
      onFavorite: mockOnFavorite,
      onUnfavorite: mockOnUnfavorite,
      userFavorites: {},
      highlightedQuery: undefined,
    };
  });

  it('radio is checked when isSelected is true', () => {
    render(<SavedQueryCard {...defaultProps} isSelected />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('radio is not checked when isSelected is false', () => {
    render(<SavedQueryCard {...defaultProps} isSelected={false} />);
    expect(screen.getByRole('radio')).not.toBeChecked();
  });

  it('calls onSelect with the query when the radio changes', async () => {
    const onSelect = jest.fn();
    const { user } = render(<SavedQueryCard {...defaultProps} onSelect={onSelect} />);
    await user.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith(mockSavedQuery);
  });

  it('radio is disabled when disabled prop is true', () => {
    render(<SavedQueryCard {...defaultProps} disabled />);
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('renders Star button when query is not starred', () => {
    mockContext.userFavorites = {};
    render(<SavedQueryCard {...defaultProps} isSelected />);
    expect(screen.getByRole('button', { name: 'Star' })).toBeInTheDocument();
  });

  it('renders Unstar button when query is starred', () => {
    mockContext.userFavorites = { [mockSavedQuery.uid!]: true };
    render(<SavedQueryCard {...defaultProps} isSelected />);
    expect(screen.getByRole('button', { name: 'Unstar' })).toBeInTheDocument();
  });

  it('calls onFavorite with uid when clicking the Star button', async () => {
    mockContext.userFavorites = {};
    const { user } = render(<SavedQueryCard {...defaultProps} isSelected />);
    await user.click(screen.getByRole('button', { name: 'Star' }));
    expect(mockOnFavorite).toHaveBeenCalledWith(mockSavedQuery.uid);
  });

  it('calls onUnfavorite with uid when clicking the Unstar button', async () => {
    mockContext.userFavorites = { [mockSavedQuery.uid!]: true };
    const { user } = render(<SavedQueryCard {...defaultProps} isSelected />);
    await user.click(screen.getByRole('button', { name: 'Unstar' }));
    expect(mockOnUnfavorite).toHaveBeenCalledWith(mockSavedQuery.uid);
  });

  it('sets aria-current when card is highlighted', () => {
    mockContext.highlightedQuery = mockSavedQuery.uid;
    render(<SavedQueryCard {...defaultProps} />);
    expect(screen.getByRole('radio').closest('label')).toHaveAttribute('aria-current', 'true');
  });

  it('does not set aria-current when card is not highlighted', () => {
    mockContext.highlightedQuery = undefined;
    render(<SavedQueryCard {...defaultProps} />);
    expect(screen.getByRole('radio').closest('label')).not.toHaveAttribute('aria-current');
  });
});
