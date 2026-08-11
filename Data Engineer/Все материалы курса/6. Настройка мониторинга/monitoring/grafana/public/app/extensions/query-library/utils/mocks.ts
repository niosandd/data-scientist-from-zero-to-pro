import { type PromQuery } from '@grafana/prometheus';
import { type QueryLibraryContextType } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { QueryLibraryTab, type SavedQuery } from 'app/features/explore/QueryLibrary/types';

const mockQueryExpression = 'go_gc_pauses_seconds_count{instance=\"host.docker.internal:3000\"}';
export const mockQuery: PromQuery = {
  refId: 'A',
  datasource: {
    uid: 'Prometheus0',
    type: 'prometheus',
  },
  expr: mockQueryExpression,
};

export const mockSavedQuery: SavedQuery = {
  uid: '0',
  datasourceName: 'prometheus',
  datasourceRef: { type: 'prometheus', uid: 'Prometheus0' },
  datasourceType: 'prometheus',
  createdAtTimestamp: 0,
  query: mockQuery,
  queryText: 'http_requests_total{job="test"}',
  title: 'template0',
  description: 'template0-desc',
  isLocked: false,
  isVisible: true,
  user: {
    uid: 'viewer:JohnDoe',
    displayName: 'John Doe',
    avatarUrl: 'johnDoeAvatarUrl',
  },
  tags: ['tag1', 'tag2'],
};

export const mockNewSavedQuery: SavedQuery = {
  ...mockSavedQuery,
  title: 'New query title',
  uid: undefined,
};

export const mockQueryLibraryContext: QueryLibraryContextType = {
  onSave: jest.fn(),
  isDrawerOpen: false,
  activeTab: QueryLibraryTab.ALL,
  newQuery: undefined,
  highlightedQuery: undefined,
  activeDatasources: [],
  onSelectQuery: jest.fn(),
  onSelectQueries: jest.fn(),
  onFavorite: jest.fn(),
  onUnfavorite: jest.fn(),
  userFavorites: {},
  setUserFavorites: jest.fn(),
  isEditingQuery: false,
  setIsEditingQuery: jest.fn(),
  onAddHistoryQueryToLibrary: jest.fn(),
  setActiveTab: jest.fn(),
  onTabChange: jest.fn(),
  context: 'explore',
  queryLibraryEnabled: true,
  renderSavedQueryButtons: jest.fn(),
  renderQueryLibraryEditingHeader: jest.fn(),
  openDrawer: jest.fn(),
  closeDrawer: jest.fn(),
  clearCloseGuard: jest.fn(),
  triggerAnalyticsEvent: jest.fn(),
  setNewQuery: jest.fn(),
  setCloseGuard: jest.fn(),
  templateVariableOverrides: {},
  setTemplateVariableOverrides: jest.fn(),
  openedToSaveQuery: false,
};
