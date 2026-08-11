import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'test/test-utils';

import { setTestFlags } from '@grafana/test-utils/unstable';
import { QueryLibraryTab } from 'app/features/explore/QueryLibrary/types';
import { type RichHistoryQuery } from 'app/types/explore';

import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';
import { mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueriesModal } from './SavedQueriesModal';

jest.mock('./SavedQueriesLayout', () => ({
  SavedQueriesLayout: () => <div data-testid="saved-layout" />,
}));

type MockRecentLayoutProps = {
  onSelectQuery: (query: RichHistoryQuery) => void;
  onClose: () => void;
  onSaveToLibrary?: (query: RichHistoryQuery) => void;
  onAnalyticsEvent?: (event: string, properties?: Record<string, string | boolean | undefined>) => void;
};

let mockCapturedRecentProps: MockRecentLayoutProps | undefined;

jest.mock('app/features/explore/RecentQueries/RecentQueriesLayout', () => ({
  RecentQueriesLayout: (props: MockRecentLayoutProps) => {
    mockCapturedRecentProps = props;
    return <div data-testid="recent-layout" />;
  },
}));

const mockOnTabChange = jest.fn();
const mockCloseDrawer = jest.fn();

let mockActiveTab = QueryLibraryTab.ALL;

jest.mock('../../../features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    isDrawerOpen: true,
    activeTab: mockActiveTab,
    onTabChange: mockOnTabChange,
    closeDrawer: mockCloseDrawer,
  }),
}));

describe('SavedQueriesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveTab = QueryLibraryTab.ALL;
    setTestFlags({ 'queryHistory.recentQueriesUI': true });
  });

  afterEach(() => {
    act(() => {
      setTestFlags({});
    });
  });

  describe('when recentQueriesUI is enabled', () => {
    it('renders both tabs', () => {
      render(<SavedQueriesModal />);
      expect(screen.getByRole('tab', { name: 'Saved queries' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Recent queries' })).toBeInTheDocument();
    });

    it('shows saved queries layout by default when activeTab is ALL', () => {
      render(<SavedQueriesModal />);
      expect(screen.getByTestId('saved-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('recent-layout')).not.toBeInTheDocument();
    });

    it('shows recent queries layout when activeTab is RECENT', async () => {
      mockActiveTab = QueryLibraryTab.RECENT;
      render(<SavedQueriesModal />);
      expect(screen.getByTestId('recent-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('saved-layout')).not.toBeInTheDocument();
      // RecentQueriesDescription resolves rich-history settings asynchronously; await it so the
      // resulting state update is wrapped in act().
      await screen.findByText(/within the past/i);
    });

    it('calls onTabChange with RECENT when clicking Recent queries tab', async () => {
      const user = userEvent.setup();
      render(<SavedQueriesModal />);
      await user.click(screen.getByRole('tab', { name: 'Recent queries' }));
      expect(mockOnTabChange).toHaveBeenCalledWith(QueryLibraryTab.RECENT);
    });

    it('calls onTabChange with ALL when clicking Saved queries tab', async () => {
      mockActiveTab = QueryLibraryTab.RECENT;
      const user = userEvent.setup();
      render(<SavedQueriesModal />);
      await user.click(screen.getByRole('tab', { name: 'Saved queries' }));
      expect(mockOnTabChange).toHaveBeenCalledWith(QueryLibraryTab.ALL);
    });
  });

  describe('when recentQueriesUI is disabled', () => {
    beforeEach(() => {
      setTestFlags({ 'queryHistory.recentQueriesUI': false });
    });

    it('does not render the Recent queries tab', () => {
      render(<SavedQueriesModal />);
      expect(screen.getByRole('tab', { name: 'Saved queries' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Recent queries' })).not.toBeInTheDocument();
    });

    it('shows saved queries layout when activeTab is ALL', () => {
      render(<SavedQueriesModal />);
      expect(screen.getByTestId('saved-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('recent-layout')).not.toBeInTheDocument();
    });

    it('falls back to saved queries layout even when a stale activeTab is RECENT', () => {
      mockActiveTab = QueryLibraryTab.RECENT;
      render(<SavedQueriesModal />);
      expect(screen.getByTestId('saved-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('recent-layout')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Saved queries', selected: true })).toBeInTheDocument();
    });
  });

  describe('Recent tab wiring', () => {
    const recentQuery: RichHistoryQuery = {
      id: 'rq-1',
      createdAt: 1749480000000,
      datasourceUid: 'ds-uid',
      datasourceName: 'Prometheus',
      starred: false,
      comment: 'my note',
      queries: [{ refId: 'A', datasource: { type: 'prometheus', uid: 'ds-uid' } }],
    };

    beforeEach(() => {
      mockActiveTab = QueryLibraryTab.RECENT;
      mockCapturedRecentProps = undefined;
    });

    it('selects all queries from the entry and closes the drawer on select', async () => {
      render(<SavedQueriesModal />);
      await screen.findByText(/within the past/i);
      mockCapturedRecentProps!.onSelectQuery(recentQuery);
      expect(mockQueryLibraryContext.onSelectQueries).toHaveBeenCalledWith(recentQuery.queries, 'Prometheus');
      expect(mockCloseDrawer).toHaveBeenCalledWith(true);
    });

    it('passes the history comment as the saved query description', async () => {
      render(<SavedQueriesModal />);
      await screen.findByText(/within the past/i);
      mockCapturedRecentProps!.onSaveToLibrary?.(recentQuery);
      expect(mockQueryLibraryContext.onAddHistoryQueryToLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'my note' })
      );
    });

    it('ignores analytics events that have no enterprise interaction mapping', async () => {
      render(<SavedQueriesModal />);
      await screen.findByText(/within the past/i);
      mockCapturedRecentProps!.onAnalyticsEvent?.('queryStarred', { starred: true });
      expect(mockQueryLibraryContext.triggerAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('maps known analytics events to QueryLibraryInteractions handlers', async () => {
      render(<SavedQueriesModal />);
      await screen.findByText(/within the past/i);
      mockCapturedRecentProps!.onAnalyticsEvent?.('searchBarFocused', undefined);
      expect(mockQueryLibraryContext.triggerAnalyticsEvent).toHaveBeenCalledWith(
        QueryLibraryInteractions.searchBarFocused,
        undefined
      );
    });
  });
});
