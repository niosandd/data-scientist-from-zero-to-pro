import { act, render, screen } from '@testing-library/react';

import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueriesDetails } from './SavedQueriesDetails';
import { SavedQueriesLibrary } from './SavedQueriesLibrary';
import { SavedQueriesList } from './SavedQueriesList';

// Mock sub-components so this suite tests library-level state management only.
// Each sub-component has its own test file.
jest.mock('./SavedQueriesList', () => ({
  SavedQueriesList: jest.fn(() => <div data-testid="list" />),
}));

jest.mock('./SavedQueriesDetails', () => ({
  SavedQueriesDetails: jest.fn(() => <div data-testid="details" />),
}));

const MockedList = jest.mocked(SavedQueriesList);
const MockedDetails = jest.mocked(SavedQueriesDetails);

let mockHighlightedQuery: string | undefined = undefined;

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    highlightedQuery: mockHighlightedQuery,
  }),
}));

const makeQuery = (uid: string): SavedQuery => ({ ...mockSavedQuery, uid, title: `Query ${uid}` });

const defaultProps = {
  queryRows: [],
  newQuery: undefined as SavedQuery | undefined,
  isLoading: false,
};

/** Returns the most recent props passed to the mocked component. */
const lastProps = <T,>(mock: jest.MockedFunction<any>): T => mock.mock.calls[mock.mock.calls.length - 1][0];

describe('SavedQueriesLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHighlightedQuery = undefined;
  });

  it('renders the Query library region landmark', () => {
    render(<SavedQueriesLibrary {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'Query library' })).toBeInTheDocument();
  });

  it('renders both list and details sub-components when queries exist', () => {
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[makeQuery('a')]} />);
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.getByTestId('details')).toBeInTheDocument();
  });

  it('renders the empty state centered across the full library when no queries exist', () => {
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[]} />);
    expect(screen.queryByTestId('list')).not.toBeInTheDocument();
    expect(screen.getByText('No saved queries found')).toBeInTheDocument();
  });

  it('newQuery takes priority as selectedQuery over selectedUid', () => {
    const queryA = makeQuery('a');
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined, title: 'New query' };

    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} newQuery={newQuery} />);

    act(() => {
      lastProps<any>(MockedList).onSelect(queryA);
    });

    // Even after selecting queryA, newQuery should win
    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(newQuery);
  });

  it('resets selectedQuery when onDelete is called, then auto-selects first remaining query', () => {
    const queryA = makeQuery('a');
    const queryB = makeQuery('b');
    const { rerender } = render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA, queryB]} />);

    act(() => {
      lastProps<any>(MockedList).onSelect(queryA);
    });
    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryA);

    // Simulate delete: clear selection and remove queryA from the list (as the refetch would)
    act(() => {
      lastProps<any>(MockedDetails).onDelete();
    });
    rerender(<SavedQueriesLibrary {...defaultProps} queryRows={[queryB]} />);

    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryB);
  });

  it('selects the new query uid when onSaveNew is called and query is already in the list', () => {
    const queryA = makeQuery('a');
    const queryB = makeQuery('b');
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA, queryB]} />);

    act(() => {
      lastProps<any>(MockedDetails).onSaveNew('b');
    });

    expect(lastProps<any>(MockedList).selectedUid).toBe('b');
  });

  it('holds the new uid selection while the created query is still loading (pending uid guard)', () => {
    const queryA = makeQuery('a');
    // onSaveNew fires before the list refetches — 'new-uid' is not in queryRows yet
    const { rerender } = render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);

    act(() => {
      lastProps<any>(MockedDetails).onSaveNew('new-uid');
    });

    // Still only queryA in the list — auto-select-first must not override 'new-uid'
    rerender(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);
    expect(lastProps<any>(MockedList).selectedUid).toBe('new-uid');

    // List refetches and the new query arrives — selection should remain on it
    const newQuery = makeQuery('new-uid');
    rerender(<SavedQueriesLibrary {...defaultProps} queryRows={[newQuery, queryA]} />);
    expect(lastProps<any>(MockedList).selectedUid).toBe('new-uid');
  });

  it('propagates liveTitle from details to list', () => {
    const queryA = makeQuery('a');
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);

    act(() => {
      lastProps<any>(MockedDetails).onTitleChange('Edited title');
    });

    expect(lastProps<any>(MockedList).liveTitle).toBe('Edited title');
  });

  it('auto-selects the highlighted query when it arrives in the list', () => {
    const queryA = makeQuery('a');
    mockHighlightedQuery = 'a';

    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);

    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryA);
  });

  it('auto-selects the highlighted query even when it is not the first query', () => {
    const queryA = makeQuery('a');
    const queryB = makeQuery('b');
    mockHighlightedQuery = 'b'; // b is not first — auto-select-first must not override it

    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA, queryB]} />);

    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryB);
  });

  it('does not select a missing highlightedQuery — auto-selects first visible query instead', () => {
    const queryA = makeQuery('a');
    mockHighlightedQuery = 'missing-uid';
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);
    // 'missing-uid' is not in the list, so it is not selected; auto-select picks the first visible query
    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryA);
  });

  it('auto-selects the first query when loading completes with no prior selection', () => {
    const queryA = makeQuery('a');
    const queryB = makeQuery('b');
    const { rerender } = render(<SavedQueriesLibrary {...defaultProps} isLoading queryRows={[]} />);

    rerender(<SavedQueriesLibrary {...defaultProps} isLoading={false} queryRows={[queryA, queryB]} />);

    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryA);
  });

  it('auto-selects the first query when a filter change removes the selected query', () => {
    const queryA = makeQuery('a');
    const queryB = makeQuery('b');
    const { rerender } = render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA, queryB]} />);

    act(() => {
      lastProps<any>(MockedList).onSelect(queryB);
    });
    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryB);

    // Simulate filter removing queryB from results
    rerender(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} />);

    expect(lastProps<any>(MockedDetails).selectedQuery).toEqual(queryA);
  });

  it('does not auto-select when isLoading is true', () => {
    const queryA = makeQuery('a');
    render(<SavedQueriesLibrary {...defaultProps} isLoading queryRows={[queryA]} />);
    expect(lastProps<any>(MockedDetails).selectedQuery).toBeUndefined();
  });

  it('does not auto-select when queryRows is empty', () => {
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[]} />);
    // Empty state renders instead of list/details — MockedDetails is never called
    expect(MockedDetails).not.toHaveBeenCalled();
  });

  it('does not auto-select when newQuery is active', () => {
    const queryA = makeQuery('a');
    const newQuery: SavedQuery = { ...mockSavedQuery, uid: undefined, title: 'New query' };
    render(<SavedQueriesLibrary {...defaultProps} queryRows={[queryA]} newQuery={newQuery} />);
    // selectedUid should remain unset; newQuery drives details instead
    expect(lastProps<any>(MockedList).selectedUid).toBeUndefined();
  });
});
