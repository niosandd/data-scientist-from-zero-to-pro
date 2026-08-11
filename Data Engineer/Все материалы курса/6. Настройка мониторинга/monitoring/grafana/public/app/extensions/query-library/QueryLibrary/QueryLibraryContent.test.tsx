import { act, screen, within } from '@testing-library/react';

import { setPluginLinksHook } from '@grafana/runtime';
import { generatedAPI } from 'app/extensions/api/clients/queries/v1beta1/endpoints.gen';
import { type QueryLibraryContextType } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';
import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { render } from '../../../../test/test-utils';
import { selectors } from '../e2e-selectors/selectors';
import { QueryLibraryTab } from '../types';
import { mockNewSavedQuery, mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { QueryLibraryContent } from './QueryLibraryContent';

const setCloseGuard = jest.fn();
const defaultContext: QueryLibraryContextType = {
  ...mockQueryLibraryContext,
  setCloseGuard,
};

let context = defaultContext;

jest.mock('../utils/identity', () => ({
  canEditQuery: jest.fn().mockReturnValue(true),
  hasWritePermissions: jest.fn().mockReturnValue(true),
}));

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => context,
}));

jest.mock('app/core/app_events', () => ({
  appEvents: {
    subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    publish: jest.fn(),
  },
}));

let usePluginLinksMock: jest.Mock;

beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
  context = defaultContext;
  usePluginLinksMock = jest.fn().mockReturnValue({ links: [], isLoading: false });
  setPluginLinksHook(usePluginLinksMock);
});

afterEach(() => {
  usePluginLinksMock.mockClear();
  usePluginLinksMock.mockReturnValue({ links: [], isLoading: false });
});

const getNewQueryRow = async () => {
  const radiogroup = await screen.findByRole('radiogroup');
  return radiogroup.querySelector('[data-query-uid="new-query"]');
};

describe('QueryLibraryContent', () => {
  const defaultProps = {
    queryRows: [
      { ...mockSavedQuery, uid: '1', title: 'Query 1' },
      { ...mockSavedQuery, uid: '2', title: 'Query 2', description: 'Query 2 description' },
    ],
    isFiltered: false,
    userFavorites: {
      '2': true,
    },
    onFavorite: jest.fn(),
    onUnfavorite: jest.fn(),
    changeTab: jest.fn(),
    activeTab: QueryLibraryTab.ALL,
    isLoading: false,
  };

  it('should render list of queries', async () => {
    render(<QueryLibraryContent {...defaultProps} />);

    const radiogroup = await screen.findByRole('radiogroup');
    expect(within(radiogroup).getByText('Query 1')).toBeInTheDocument();
    expect(within(radiogroup).getByText('Query 2')).toBeInTheDocument();
  });

  it('should render list of queries but not new query', async () => {
    render(<QueryLibraryContent {...defaultProps} />);

    const radiogroup = await screen.findByRole('radiogroup');
    expect(within(radiogroup).getByText('Query 1')).toBeInTheDocument();
    expect(within(radiogroup).getByText('Query 2')).toBeInTheDocument();

    const newQuery = await getNewQueryRow();
    expect(newQuery).not.toBeInTheDocument();
  });

  it('should render list of queries and new query at the top', async () => {
    render(<QueryLibraryContent {...defaultProps} newQuery={mockNewSavedQuery} />);

    const radiogroup = await screen.findByRole('radiogroup');

    const newQuery = await getNewQueryRow();
    expect(newQuery).toBeInTheDocument();
    expect(within(radiogroup).getByText('New query title')).toBeInTheDocument();

    const children = radiogroup.children;
    expect(children[0].getAttribute('data-query-uid')).toBe('new-query');

    expect(within(radiogroup).getByText('Query 1')).toBeInTheDocument();
    expect(within(radiogroup).getByText('Query 2')).toBeInTheDocument();
  });

  it('should render skeleton list but concrete new query at the top', async () => {
    render(<QueryLibraryContent {...defaultProps} isLoading={true} queryRows={[]} newQuery={mockNewSavedQuery} />);

    const radiogroup = await screen.findByRole('radiogroup');

    const newQuery = await getNewQueryRow();
    expect(newQuery).toBeInTheDocument();
    expect(within(radiogroup).getByText('New query title')).toBeInTheDocument();

    const children = radiogroup.children;
    expect(children[0].getAttribute('data-query-uid')).toBe('new-query');

    expect(within(radiogroup).queryByText('Query 1')).not.toBeInTheDocument();
    expect(within(radiogroup).queryByText('Query 2')).not.toBeInTheDocument();

    const skeleton = await screen.findByTestId('query-library-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render list of queries and new query at the top but remove the new query when the user cancels the creation', async () => {
    let mockNewQuery: SavedQuery | undefined = mockNewSavedQuery;
    context.setNewQuery = jest.fn(() => (mockNewQuery = undefined));

    const { user, rerender } = render(
      <QueryLibraryContent {...defaultProps} isLoading={false} newQuery={mockNewQuery} />
    );

    const radiogroup = await screen.findByRole('radiogroup');

    const newQuery = await getNewQueryRow();
    expect(newQuery).toBeInTheDocument();
    expect(within(radiogroup).getByText('New query title')).toBeInTheDocument();

    const children = radiogroup.children;
    expect(children[0].getAttribute('data-query-uid')).toBe('new-query');

    const query1 = screen.getByRole('radio', { name: 'Query 1' });
    const query2 = screen.getByRole('radio', { name: 'Query 2' });
    expect(query1).toBeInTheDocument();
    expect(query2).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(<QueryLibraryContent {...defaultProps} isLoading={false} newQuery={undefined} />);

    expect(newQuery).not.toBeInTheDocument();

    expect(query1).toBeInTheDocument();
    expect(query2).toBeInTheDocument();
    expect(query1).toBeChecked();
  });

  it('should automatically select first query', async () => {
    render(<QueryLibraryContent {...defaultProps} />);

    expect(await screen.findByRole('radio', { name: 'Query 1' })).toBeChecked();
    expect(await screen.findByRole('radio', { name: 'Query 2' })).not.toBeChecked();
  });

  it('should automatically select new query', async () => {
    render(<QueryLibraryContent {...defaultProps} newQuery={mockNewSavedQuery} />);

    // cannot be found by role because it doesn't have uid.
    const newQuery = screen.getByTestId(selectors.components.queryLibraryDrawer.item(mockNewSavedQuery.title ?? ''));
    expect(newQuery.querySelector('input')).toBeChecked();
    expect(await screen.findByRole('radio', { name: 'Query 1' })).not.toBeChecked();
    expect(await screen.findByRole('radio', { name: 'Query 2' })).not.toBeChecked();
  });

  it('should show empty state when no queries are available', async () => {
    context.newQuery = undefined;
    render(<QueryLibraryContent {...defaultProps} queryRows={[]} />);

    expect(await screen.findByText("You haven't saved any queries yet")).toBeInTheDocument();
    expect(await screen.findByText('Start adding them from Explore or when editing a dashboard')).toBeInTheDocument();
  });

  it('should show not found state when filtered queries are empty and there is no new query', async () => {
    render(<QueryLibraryContent {...defaultProps} queryRows={[]} isFiltered={true} />);

    expect(await screen.findByText('No results found')).toBeInTheDocument();
    expect(await screen.findByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
  });

  it('should NOT show not found state when filtered queries are empty, but there is a new query', async () => {
    render(<QueryLibraryContent {...defaultProps} queryRows={[]} isFiltered={true} newQuery={mockNewSavedQuery} />);

    const newQuery = await getNewQueryRow();
    expect(newQuery).toBeInTheDocument();

    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    expect(screen.queryByText('Try adjusting your search or filter criteria')).not.toBeInTheDocument();
  });

  it('should update selected query when queryRows changes', async () => {
    context.newQuery = undefined;
    const { rerender } = render(<QueryLibraryContent {...defaultProps} />);

    // Initial selection should be first query
    expect(await screen.findByRole('radio', { name: 'Query 1' })).toBeChecked();
    expect(await screen.findByRole('radio', { name: 'Query 2' })).not.toBeChecked();

    // Update queryRows to remove first query
    rerender(<QueryLibraryContent {...defaultProps} queryRows={[defaultProps.queryRows[1]]} />);

    // Selection should update to remaining query
    expect(screen.queryByRole('radio', { name: 'Query 1' })).not.toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: 'Query 2' })).toBeChecked();
  });

  it('should auto-reset to first query when selected index becomes out of bounds', async () => {
    const { user, rerender } = render(<QueryLibraryContent {...defaultProps} />);

    // Select the second query
    const secondQuery = await screen.findByRole('radio', { name: 'Query 2' });
    await user.click(secondQuery);
    expect(secondQuery).toBeChecked();

    // Simulate filtering that removes the selected query (index 1)
    // Pass only the first query, making index 1 out of bounds
    rerender(<QueryLibraryContent {...defaultProps} queryRows={[defaultProps.queryRows[0]]} />);

    // Should auto-reset to first available query
    expect(await screen.findByRole('radio', { name: 'Query 1' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Query 2' })).not.toBeInTheDocument();
  });

  it('should only be able to tab to one query in the list', async () => {
    const { user } = render(<QueryLibraryContent {...defaultProps} />);

    const firstItem = screen.getByRole('radio', { name: 'Query 1' });
    const secondItem = screen.getByRole('radio', { name: 'Query 2' });

    await user.click(firstItem);
    expect(document.activeElement).toBe(firstItem);

    await user.tab();
    expect(document.activeElement).not.toBe(firstItem);
    expect(document.activeElement).not.toBe(secondItem);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(firstItem);
    expect(document.activeElement).not.toBe(secondItem);

    await user.tab({ shift: true });
    expect(document.activeElement).not.toBe(firstItem);
    expect(document.activeElement).not.toBe(secondItem);
  });

  it('should be able to navigate through the list with arrow keys', async () => {
    const { user } = render(<QueryLibraryContent {...defaultProps} />);

    const firstItem = screen.getByRole('radio', { name: 'Query 1' });
    const secondItem = screen.getByRole('radio', { name: 'Query 2' });

    await user.click(firstItem);
    expect(document.activeElement).toBe(firstItem);

    await user.keyboard('{arrowdown}');
    expect(document.activeElement).not.toBe(firstItem);
    expect(document.activeElement).toBe(secondItem);

    await user.keyboard('{arrowdown}');
    expect(document.activeElement).toBe(firstItem);
    expect(document.activeElement).not.toBe(secondItem);

    await user.keyboard('{arrowup}');
    expect(document.activeElement).not.toBe(firstItem);
    expect(document.activeElement).toBe(secondItem);

    await user.keyboard('{arrowup}');
    expect(document.activeElement).toBe(firstItem);
    expect(document.activeElement).not.toBe(secondItem);
  });

  it('should render empty state when using history and no queries are available', async () => {
    context.activeTab = QueryLibraryTab.RECENT;
    context.newQuery = undefined;
    render(<QueryLibraryContent {...defaultProps} queryRows={[]} usingHistory={true} />);

    expect(await screen.findByText('Find all your queries in one place')).toBeInTheDocument();
    expect(
      await screen.findByText('Queries you run in dashboards will appear here for easy access and reuse')
    ).toBeInTheDocument();
  });

  it('should render empty state when using favorites and no favorites are available', async () => {
    context.newQuery = undefined;
    context.activeTab = QueryLibraryTab.FAVORITES;
    render(<QueryLibraryContent {...defaultProps} queryRows={[]} />);

    expect(await screen.findByText("You haven't favorited any queries yet")).toBeInTheDocument();
    expect(await screen.findByText('Start favoriting them from the All tab')).toBeInTheDocument();
  });

  it('should be able to edit query title and update the selected query title on the fly', async () => {
    context.setIsEditingQuery = jest.fn((value: boolean) => {
      context.isEditingQuery = value;
    });
    const { user, rerender } = render(<QueryLibraryContent {...defaultProps} />);

    expect(await screen.findByRole('radio', { name: 'Query 1' })).toBeChecked();

    const editButton = screen.getByRole('button', { name: 'Edit query' });
    await user.click(editButton);

    rerender(<QueryLibraryContent {...defaultProps} />);

    const titleInput = await screen.findByRole('textbox', { name: /title/i });

    await user.type(titleInput, ' with title extended');
    expect(await screen.findByRole('radio', { name: 'Query 1 with title extended' })).toBeChecked();
  });

  describe('Close guard for unsaved changes', () => {
    it('should call close guard when editing with unsaved changes', async () => {
      context.isEditingQuery = false;
      context.setIsEditingQuery = jest.fn((value: boolean) => {
        context.isEditingQuery = value;
      });
      context.setCloseGuard = jest.fn((guardFunction: () => boolean) => {
        setCloseGuard(guardFunction);
      });
      const { user, rerender } = await act(async () => render(<QueryLibraryContent {...defaultProps} />));

      const editButton = await screen.getByRole('button', { name: 'Edit query' });
      await user.click(editButton);

      await act(async () => {
        await rerender(<QueryLibraryContent {...defaultProps} />);
      });

      const titleInput = await screen.findByRole('textbox', { name: /title/i });
      await user.type(titleInput, ' updated');

      expect(setCloseGuard).toHaveBeenCalled();
      const guardFunction = setCloseGuard.mock.lastCall[0];
      expect(guardFunction()).toBe(false);
    });

    it('should allow close when not editing', async () => {
      context.isEditingQuery = false;
      context.setCloseGuard = jest.fn((guardFunction: () => boolean) => {
        setCloseGuard(guardFunction);
      });
      render(<QueryLibraryContent {...defaultProps} />);

      // Wait for component to render with query list
      const radiogroup = await screen.findByRole('radiogroup');
      expect(within(radiogroup).getByRole('radio', { name: 'Query 1' })).toBeInTheDocument();

      const guardFunction = setCloseGuard.mock.lastCall[0];
      expect(guardFunction()).toBe(true);
    });

    it('should allow close when editing but no changes made', async () => {
      context.isEditingQuery = false;
      context.setIsEditingQuery = jest.fn((value: boolean) => {
        context.isEditingQuery = value;
      });
      context.setCloseGuard = jest.fn((guardFunction: () => boolean) => {
        setCloseGuard(guardFunction);
      });
      const { user, rerender } = render(<QueryLibraryContent {...defaultProps} />);

      const editButton = await screen.findByRole('button', { name: 'Edit query' });
      await user.click(editButton);

      rerender(<QueryLibraryContent {...defaultProps} />);

      // Wait for edit form to render
      const titleInput = await screen.findByRole('textbox', { name: /title/i });
      expect(titleInput).toHaveValue('Query 1');

      const guardFunction = setCloseGuard.mock.lastCall[0];
      expect(guardFunction()).toBe(true);
    });

    it('should clean up close guard on unmount', () => {
      const setCloseGuard = jest.fn();
      context.setCloseGuard = jest.fn((guardFunction: () => boolean) => {
        setCloseGuard(guardFunction);
      });
      const { unmount } = render(<QueryLibraryContent {...defaultProps} />);

      setCloseGuard.mockClear();
      unmount();

      expect(setCloseGuard).toHaveBeenCalledWith(expect.any(Function));
      const cleanupFunction = setCloseGuard.mock.lastCall[0];
      expect(cleanupFunction()).toBe(true);
    });
  });
});
