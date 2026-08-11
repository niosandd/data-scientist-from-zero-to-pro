import { config } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { canEditQuery, hasWritePermissions } from './identity';

// Mock contextSrv
jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    user: {
      uid: 'user123',
    },
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
    isEditor: true,
  },
}));

const mockContextSrv = jest.mocked(contextSrv);

describe('identity', () => {
  const mockQuery: SavedQuery = {
    uid: 'query1',
    datasourceName: 'Prometheus',
    datasourceRef: { type: 'prometheus', uid: 'prom1' },
    datasourceType: 'prometheus',
    createdAtTimestamp: 1716796800000,
    query: {
      refId: 'A',
      datasource: { type: 'prometheus', uid: 'prom1' },
    },
    queryText: 'http_requests_total',
    title: 'HTTP Requests',
    description: 'Monitor HTTP requests',
    isLocked: false,
    isVisible: true,
    user: {
      uid: 'user:user123',
      displayName: 'Current User',
    },
    tags: ['monitoring'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContextSrv.user.uid = 'user123';
    config.featureToggles = {};
  });

  describe('canEditQuery', () => {
    it('should return true when user is the author and not a viewer', () => {
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return false;
        }
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      mockContextSrv.isEditor = true;
      const result = canEditQuery(mockQuery);

      expect(result).toBe(true);
      expect(mockContextSrv.hasRole).toHaveBeenCalledWith('Admin');
    });

    it('should return true when user has write permissions', () => {
      mockContextSrv.isEditor = false;
      mockContextSrv.hasPermission.mockReturnValue(true);
      config.featureToggles.savedQueriesRBAC = true;

      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return false;
        }
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      mockContextSrv.isSignedIn = true;
      const result = canEditQuery(mockQuery);

      expect(result).toBe(true);
      expect(mockContextSrv.hasRole).not.toHaveBeenCalled();
    });

    it('should return false when user is the author but has no write permission', () => {
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return true;
        }
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      mockContextSrv.isEditor = false;
      const result = canEditQuery(mockQuery);

      expect(result).toBe(false);
    });

    it('should return false when user does not have permission', () => {
      mockContextSrv.isEditor = true;
      mockContextSrv.hasPermission.mockReturnValue(false);

      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return true;
        }
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      config.featureToggles.savedQueriesRBAC = true;
      const result = canEditQuery(mockQuery);

      expect(result).toBe(false);
      expect(mockContextSrv.hasRole).not.toHaveBeenCalled();
    });

    it('should return true when user is the author and has write permission via RBAC', () => {
      config.featureToggles.savedQueriesRBAC = true;
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      mockContextSrv.isEditor = false;
      mockContextSrv.hasPermission.mockReturnValue(true);
      const result = canEditQuery(mockQuery);

      expect(result).toBe(true);
    });

    it('should return true when user is admin even if not the author', () => {
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return false;
        }
        if (role === 'Admin') {
          return true;
        }
        return false;
      });

      mockContextSrv.isEditor = true;

      const differentAuthorQuery: SavedQuery = {
        ...mockQuery,
        user: {
          uid: 'user:different-user',
          displayName: 'Different User',
        },
      };

      const result = canEditQuery(differentAuthorQuery);

      expect(result).toBe(true);
    });

    it('should return false when user is not the author and not admin', () => {
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return false;
        }
        if (role === 'Admin') {
          return false;
        }
        return false;
      });

      const differentAuthorQuery: SavedQuery = {
        ...mockQuery,
        user: {
          uid: 'user:different-user',
          displayName: 'Different User',
        },
      };

      const result = canEditQuery(differentAuthorQuery);

      expect(result).toBe(false);
    });
  });

  describe('hasWritePermissions', () => {
    it('should return true when user is not a viewer', () => {
      mockContextSrv.hasRole.mockImplementation((role: string) => {
        if (role === 'Viewer') {
          return false;
        }
        return false;
      });

      const result = hasWritePermissions();

      expect(result).toBe(true);
    });

    it('should return false when user has no write permission', () => {
      mockContextSrv.isEditor = false;
      mockContextSrv.hasPermission.mockReturnValue(false);
      const result = hasWritePermissions();

      expect(result).toBe(false);
    });

    it('should return true when user has write permission via RBAC', () => {
      mockContextSrv.isEditor = false;
      mockContextSrv.hasPermission.mockReturnValue(true);
      config.featureToggles.savedQueriesRBAC = true;
      const result = hasWritePermissions();

      expect(result).toBe(true);
    });
  });
});
