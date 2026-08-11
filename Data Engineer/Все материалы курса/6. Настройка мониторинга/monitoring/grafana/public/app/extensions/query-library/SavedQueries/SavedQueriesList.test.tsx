import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueriesList } from './SavedQueriesList';

// Mock the card so list tests focus on list-level behavior (selection, liveTitle, disabled, tabbable).
// SavedQueryCard has its own test file.
jest.mock('./SavedQueryCard', () => ({
  SavedQueryCard: Object.assign(
    jest.fn(({ queryRow, isSelected, disabled, isTabbable, onSelect }: any) => (
      <div
        data-testid="saved-query-card"
        data-uid={queryRow.uid}
        data-selected={String(isSelected)}
        data-disabled={String(!!disabled)}
        data-tabbable={String(!!isTabbable)}
        data-title={queryRow.title}
      >
        <button onClick={() => onSelect(queryRow)}>select {queryRow.uid}</button>
      </div>
    )),
    { Skeleton: () => <div data-testid="saved-query-card-skeleton" /> }
  ),
}));

let mockIsEditingQuery = false;

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    isEditingQuery: mockIsEditingQuery,
  }),
}));

const makeQuery = (uid: string): SavedQuery => ({ ...mockSavedQuery, uid, title: `Query ${uid}` });

describe('SavedQueriesList', () => {
  const listRef = createRef<HTMLDivElement>();

  const defaultProps = {
    queryRows: [],
    newQuery: undefined,
    isLoading: false,
    selectedUid: undefined,
    liveTitle: undefined,
    listRef,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEditingQuery = false;
  });

  it('renders skeleton cards while loading', () => {
    render(<SavedQueriesList {...defaultProps} isLoading />);
    expect(screen.getAllByTestId('saved-query-card-skeleton')).toHaveLength(20);
  });

  it('renders the radiogroup when queries exist', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a')]} />);
    expect(screen.getByRole('radiogroup', { name: 'Saved queries' })).toBeInTheDocument();
  });

  it('renders a card for each query row', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a'), makeQuery('b')]} />);
    expect(screen.getAllByTestId('saved-query-card')).toHaveLength(2);
  });

  it('renders newQuery card at the top', () => {
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined, title: 'New query' };
    render(<SavedQueriesList {...defaultProps} newQuery={newQuery} />);
    const cards = screen.getAllByTestId('saved-query-card');
    expect(cards[0]).toHaveAttribute('data-title', 'New query');
  });

  it('newQuery card is always selected', () => {
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined };
    render(<SavedQueriesList {...defaultProps} newQuery={newQuery} />);
    const cards = screen.getAllByTestId('saved-query-card');
    expect(cards[0]).toHaveAttribute('data-selected', 'true');
  });

  it('newQuery card uses liveTitle when provided', () => {
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined, title: 'Old title' };
    render(<SavedQueriesList {...defaultProps} newQuery={newQuery} liveTitle="Typed title" />);
    const cards = screen.getAllByTestId('saved-query-card');
    expect(cards[0]).toHaveAttribute('data-title', 'Typed title');
  });

  it('selected card shows isSelected=true', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a'), makeQuery('b')]} selectedUid="a" />);
    const cardA = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'a');
    expect(cardA).toHaveAttribute('data-selected', 'true');
  });

  it('unselected cards show isSelected=false', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a'), makeQuery('b')]} selectedUid="a" />);
    const cardB = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'b');
    expect(cardB).toHaveAttribute('data-selected', 'false');
  });

  it('applies liveTitle to the selected card when no newQuery', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a')]} selectedUid="a" liveTitle="Live title" />);
    const cardA = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'a');
    expect(cardA).toHaveAttribute('data-title', 'Live title');
  });

  it('does not apply liveTitle to non-selected cards', () => {
    render(
      <SavedQueriesList
        {...defaultProps}
        queryRows={[makeQuery('a'), makeQuery('b')]}
        selectedUid="a"
        liveTitle="Live title"
      />
    );
    const cardB = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'b');
    expect(cardB).toHaveAttribute('data-title', 'Query b');
  });

  it('disables query cards when newQuery is pending', () => {
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined };
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a')]} newQuery={newQuery} />);
    // The existing query card (not the newQuery card) should be disabled
    const existingCard = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'a');
    expect(existingCard).toHaveAttribute('data-disabled', 'true');
  });

  it('disables query cards when isEditingQuery is true', () => {
    mockIsEditingQuery = true;
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a')]} />);
    const card = screen.getByTestId('saved-query-card');
    expect(card).toHaveAttribute('data-disabled', 'true');
  });

  it('selected card is tabbable', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a'), makeQuery('b')]} selectedUid="a" />);
    const cardA = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'a');
    const cardB = screen.getAllByTestId('saved-query-card').find((el) => el.getAttribute('data-uid') === 'b');
    expect(cardA).toHaveAttribute('data-tabbable', 'true');
    expect(cardB).toHaveAttribute('data-tabbable', 'false');
  });

  it('first card is tabbable when nothing is selected and no newQuery', () => {
    render(<SavedQueriesList {...defaultProps} queryRows={[makeQuery('a'), makeQuery('b')]} />);
    const cards = screen.getAllByTestId('saved-query-card');
    expect(cards[0]).toHaveAttribute('data-tabbable', 'true');
    expect(cards[1]).toHaveAttribute('data-tabbable', 'false');
  });
});
