import { getBackendSrv, config } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';

import { type SCIMFormData } from '../../../types';

import { updateSettings, getSettings, fetchSCIMUsers, deleteSettings, getDomain, getBaseUrl, getStackId } from './api';

// Mock dependencies
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(),
  config: {
    appSubUrl: 'https://test.grafana.net',
    namespace: 'stacks-12345',
  },
  isFetchError: jest.fn((error) => {
    return error && typeof error === 'object' && 'status' in error;
  }),
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    hasPermission: jest.fn(),
  },
}));

jest.mock('app/api/utils', () => ({
  getAPIBaseURL: jest.fn(() => '/apis/scim.grafana.app/v0alpha1/namespaces/default'),
  extractErrorMessage: jest.fn((error) => {
    if (error && typeof error === 'object') {
      if ('message' in error) {
        return error.message;
      }
      if ('data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
        return error.data.message;
      }
    }
    return String(error);
  }),
}));

jest.mock('./logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logMeasurement: jest.fn(),
}));

const mockGetBackendSrv = getBackendSrv as jest.MockedFunction<typeof getBackendSrv>;
const mockContextSrv = contextSrv as jest.Mocked<typeof contextSrv>;

describe('SCIM API Utils', () => {
  let mockBackendSrv: any;

  beforeEach(() => {
    mockBackendSrv = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    mockGetBackendSrv.mockReturnValue(mockBackendSrv);

    // Reset config mocks
    (config as any).appSubUrl = 'https://test.grafana.net';
    (config as any).namespace = 'stacks-12345';

    jest.clearAllMocks();
  });

  describe('updateSCIMSettings', () => {
    const mockFormData: SCIMFormData = {
      userSyncEnabled: true,
      groupSyncEnabled: false,
      rejectNonProvisionedUsers: true,
    };

    const mockCurrentConfig = {
      spec: {
        enableUserSync: false,
        enableGroupSync: false,
        rejectNonProvisionedUsers: false,
      },
    };

    const mockUpdatedConfig = {
      ...mockCurrentConfig,
      spec: {
        enableUserSync: true,
        enableGroupSync: false,
        rejectNonProvisionedUsers: true,
      },
    };

    it('should update SCIM settings successfully', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockBackendSrv.get.mockResolvedValue(mockCurrentConfig);
      mockBackendSrv.put.mockResolvedValue(mockUpdatedConfig);

      const result = await updateSettings(mockFormData);

      expect(result).toBe(true);
      expect(mockBackendSrv.get).toHaveBeenCalledWith(
        '/apis/scim.grafana.app/v0alpha1/namespaces/stacks-12345/config/default'
      );
      expect(mockBackendSrv.put).toHaveBeenCalledWith(
        '/apis/scim.grafana.app/v0alpha1/namespaces/stacks-12345/config/default',
        mockUpdatedConfig
      );
    });

    it('should throw access denied error when user lacks permission', async () => {
      mockContextSrv.hasPermission.mockReturnValue(false);

      await expect(updateSettings(mockFormData)).rejects.toThrow('Access denied');
      expect(mockBackendSrv.get).not.toHaveBeenCalled();
    });

    it('should handle API errors with proper error message format', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockBackendSrv.get.mockResolvedValue(mockCurrentConfig);

      const apiError = new Error('Internal server error');
      mockBackendSrv.put.mockRejectedValue(apiError);

      await expect(updateSettings(mockFormData)).rejects.toThrow(
        'Failed to update SCIM configuration: Internal server error'
      );
    });

    it('should handle FetchError with status codes', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockBackendSrv.get.mockResolvedValue(mockCurrentConfig);

      const fetchError = {
        status: 422,
        data: { message: 'Validation failed' },
        statusText: 'Unprocessable Entity',
      };
      mockBackendSrv.put.mockRejectedValue(fetchError);

      await expect(updateSettings(mockFormData)).rejects.toThrow(
        'Failed to update SCIM configuration: Validation failed'
      );
    });

    it('should preserve existing config fields', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const configWithExtraFields = {
        ...mockCurrentConfig,
        metadata: { name: 'default' },
        spec: {
          ...mockCurrentConfig.spec,
          extraField: 'value',
        },
      };
      mockBackendSrv.get.mockResolvedValue(configWithExtraFields);
      mockBackendSrv.put.mockResolvedValue({});

      await updateSettings(mockFormData);

      expect(mockBackendSrv.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: { name: 'default' },
          spec: expect.objectContaining({
            extraField: 'value',
            enableUserSync: true,
            enableGroupSync: false,
            rejectNonProvisionedUsers: true,
          }),
        })
      );
    });
  });

  describe('fetchSCIMSettings', () => {
    it('should fetch SCIM config from backend', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);

      const mockScimConfig = {
        spec: {
          enableUserSync: false,
          enableGroupSync: true,
          rejectNonProvisionedUsers: false,
        },
        status: {
          source: 'database',
        },
      };
      mockBackendSrv.get.mockResolvedValue(mockScimConfig);

      const result = await getSettings();

      expect(result).toEqual({
        userSyncEnabled: false,
        groupSyncEnabled: true,
        rejectNonProvisionedUsers: false,
        source: 'database',
      });
      expect(mockBackendSrv.get).toHaveBeenCalledTimes(1); // Only one call now!
    });

    it('should throw error when user lacks permission', async () => {
      mockContextSrv.hasPermission.mockReturnValue(false);

      await expect(getSettings()).rejects.toThrow('Access denied');
    });

    it('should handle API errors with proper error message format', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);

      const apiError = new Error('Failed to fetch config');
      // Mock the first call (verbose settings) to fail
      mockBackendSrv.get.mockRejectedValueOnce(apiError);

      await expect(getSettings()).rejects.toThrow('Failed to fetch SCIM configuration: Failed to fetch config');
    });

    it('should handle FetchError with 500 status', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);

      const fetchError = {
        status: 500,
        data: { message: 'Internal server error' },
        statusText: 'Internal Server Error',
      };
      mockBackendSrv.get.mockRejectedValueOnce(fetchError);

      await expect(getSettings()).rejects.toThrow('Failed to fetch SCIM configuration: Internal server error');
    });
  });

  describe('fetchSCIMUsers', () => {
    it('should fetch SCIM provisioned users', async () => {
      const mockUsers = {
        users: [
          { id: 1, name: 'User 1', isProvisioned: true },
          { id: 2, name: 'User 2', isProvisioned: true },
        ],
      };

      mockBackendSrv.get.mockResolvedValue(mockUsers);

      const result = await fetchSCIMUsers();

      expect(result).toEqual(mockUsers.users);
      expect(mockBackendSrv.get).toHaveBeenCalledWith('/api/users/search?perpage=1000&isProvisioned=true');
    });

    it('should return empty array when no users found', async () => {
      mockBackendSrv.get.mockResolvedValue({});

      const result = await fetchSCIMUsers();

      expect(result).toEqual([]);
    });

    it('should handle API errors with proper error message format', async () => {
      const apiError = new Error('Failed to fetch users');
      mockBackendSrv.get.mockRejectedValue(apiError);

      await expect(fetchSCIMUsers()).rejects.toThrow('Failed to fetch SCIM users: Failed to fetch users');
    });

    it('should handle FetchError with 403 status', async () => {
      const fetchError = {
        status: 403,
        data: { message: 'Forbidden' },
        statusText: 'Forbidden',
      };
      mockBackendSrv.get.mockRejectedValue(fetchError);

      await expect(fetchSCIMUsers()).rejects.toThrow('Failed to fetch SCIM users: Forbidden');
    });
  });

  describe('resetSCIMConfiguration', () => {
    it('should delete SCIM configuration', async () => {
      mockBackendSrv.delete.mockResolvedValue({});

      await deleteSettings();

      expect(mockBackendSrv.delete).toHaveBeenCalledWith(
        '/apis/scim.grafana.app/v0alpha1/namespaces/stacks-12345/config/default'
      );
    });

    it('should handle API errors with proper error message format', async () => {
      const apiError = new Error('Failed to delete configuration');
      mockBackendSrv.delete.mockRejectedValue(apiError);

      await expect(deleteSettings()).rejects.toThrow(
        'Failed to reset SCIM configuration: Failed to delete configuration'
      );
    });

    it('should handle FetchError with 404 status', async () => {
      const fetchError = {
        status: 404,
        data: { message: 'Configuration not found' },
        statusText: 'Not Found',
      };
      mockBackendSrv.delete.mockRejectedValue(fetchError);

      await expect(deleteSettings()).rejects.toThrow('Failed to reset SCIM configuration: Configuration not found');
    });
  });

  describe('getDomainInfo', () => {
    it('should return localhost info for local development', () => {
      config.appSubUrl = 'http://localhost:3000';

      const result = getDomain();

      expect(result).toEqual({ domain: 'localhost', subdomain: 'local' });
    });

    it('should return localhost info for 127.0.0.1', () => {
      config.appSubUrl = 'http://127.0.0.1:3000';

      const result = getDomain();

      expect(result).toEqual({ domain: 'localhost', subdomain: 'local' });
    });

    it('should parse grafana.net subdomain', () => {
      config.appSubUrl = 'https://my-stack.grafana.net';

      const result = getDomain();

      expect(result).toEqual({ domain: 'my-stack.grafana.net', subdomain: 'my-stack' });
    });

    it('should return hostname for other domains', () => {
      config.appSubUrl = 'https://custom.example.com';

      const result = getDomain();

      expect(result).toEqual({ domain: 'custom.example.com', subdomain: 'unknown' });
    });
  });

  describe('getTenantUrl', () => {
    it('should generate tenant URL with stack namespace', async () => {
      (config as any).namespace = 'stacks-12345';

      const result = await getBaseUrl();

      expect(result).toBe('https://test.grafana.net/apis/scim.grafana.app/v0alpha1/namespaces/stacks-12345');
    });

    it('should handle default namespace with stack ID from INI', async () => {
      (config as any).namespace = 'default';
      const mockSettings = { environment: { stack_id: '67890' } };
      mockBackendSrv.get.mockResolvedValue(mockSettings);

      const result = await getBaseUrl();

      expect(result).toBe('https://test.grafana.net/apis/scim.grafana.app/v0alpha1/namespaces/stacks-67890');
    });

    it('should fallback to default namespace when stack ID not found', async () => {
      (config as any).namespace = 'default';
      mockBackendSrv.get.mockRejectedValue(new Error('Not found'));

      const result = await getBaseUrl();

      expect(result).toBe('https://test.grafana.net/apis/scim.grafana.app/v0alpha1/namespaces/default');
    });
  });

  describe('getStackId', () => {
    it('should extract stack ID from namespace', async () => {
      config.namespace = 'stacks-12345';

      const result = getStackId();

      expect(result).toBe('12345');
    });

    it('should get stack ID from INI for default namespace', async () => {
      config.namespace = 'default';

      const result = getStackId();

      expect(result).toBe('default');
    });

    it('should return no stack ID configured when API call fails', async () => {
      (config as any).namespace = 'default';

      const result = getStackId();

      expect(result).toBe('default');
    });

    it('should return no stack ID configured when API returns null', async () => {
      (config as any).namespace = 'default';

      const result = getStackId();

      expect(result).toBe('default');
    });

    it('should return namespace when not in stacks format', async () => {
      config.namespace = 'custom-namespace';

      const result = getStackId();

      expect(result).toBe('custom-namespace');
    });
  });
});
