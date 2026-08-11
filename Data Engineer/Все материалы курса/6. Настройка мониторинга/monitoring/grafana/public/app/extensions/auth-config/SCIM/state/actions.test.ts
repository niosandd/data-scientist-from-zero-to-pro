import { thunkTester } from 'test/core/thunk/thunkTester';

import { contextSrv } from 'app/core/services/context_srv';

import { type SCIMFormData } from '../../../types';
import { SCIM_CONFIG_SOURCE } from '../constants';
import { getSettings, updateSettings, deleteSettings } from '../utils/api';

import { loadSCIMSettings, saveSCIMSettings, resetSCIMSettings } from './actions';
import {
  settingsLoaded,
  settingsLoadingBegin,
  settingsLoadingEnd,
  resetError,
  setError,
  setIsUpdated,
  settingsUpdated,
} from './reducers';

// Mock dependencies
jest.mock('@grafana/runtime', () => ({
  locationService: {
    reload: jest.fn(),
  },
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    hasPermission: jest.fn(),
  },
}));

jest.mock('../utils/api', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  deleteSettings: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logMeasurement: jest.fn(),
}));

const mockContextSrv = contextSrv as jest.Mocked<typeof contextSrv>;
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockUpdateSettings = updateSettings as jest.MockedFunction<typeof updateSettings>;
const mockDeleteSettings = deleteSettings as jest.MockedFunction<typeof deleteSettings>;

describe('SCIM Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSCIMSettings', () => {
    const mockSCIMSettings = {
      userSyncEnabled: true,
      groupSyncEnabled: false,
      rejectNonProvisionedUsers: true,
      source: SCIM_CONFIG_SOURCE.FILE,
    };

    it('should load SCIM settings successfully when user has permission', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockGetSettings.mockResolvedValue(mockSCIMSettings);

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([settingsLoadingBegin(), settingsLoaded(mockSCIMSettings)]);
    });

    it('should not load settings when user lacks permission', async () => {
      mockContextSrv.hasPermission.mockReturnValue(false);

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([]);
      expect(mockGetSettings).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const error = new Error('API Error');
      mockGetSettings.mockRejectedValue(error);

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to load SCIM settings',
          errors: ['API Error'],
        }),
      ]);
    });

    it('should handle unknown errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockGetSettings.mockRejectedValue('Unknown error');

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions[2].payload.errors).toContain('Unknown error');
    });

    it('should handle FetchError with proper error message format', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const fetchError = {
        status: 422,
        data: { message: 'Validation failed' },
        statusText: 'Unprocessable Entity',
      };
      mockGetSettings.mockRejectedValue(fetchError);

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to load SCIM settings',
          errors: ['Validation failed'],
        }),
      ]);
    });

    it('should handle system errors (5xx status)', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const systemError = {
        status: 500,
        data: { message: 'Internal server error' },
        statusText: 'Internal Server Error',
      };
      mockGetSettings.mockRejectedValue(systemError);

      const dispatchedActions = await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to load SCIM settings',
          errors: ['Internal server error'],
        }),
      ]);
    });
  });

  describe('saveSCIMSettings', () => {
    const mockFormData: SCIMFormData = {
      userSyncEnabled: true,
      groupSyncEnabled: false,
      rejectNonProvisionedUsers: true,
    };

    it('should save SCIM settings successfully', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      (mockUpdateSettings as jest.Mock).mockResolvedValue(true);
      mockGetSettings.mockResolvedValue({ ...mockFormData, source: SCIM_CONFIG_SOURCE.FILE });

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([
        resetError(),
        settingsLoadingBegin(),
        settingsUpdated({ ...mockFormData, source: SCIM_CONFIG_SOURCE.FILE }),
        setIsUpdated(true),
        settingsLoadingEnd(),
      ]);
    });

    it('should not save settings when user lacks permission', async () => {
      mockContextSrv.hasPermission.mockReturnValue(false);

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([]);
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const error = new Error('Save failed');
      (mockUpdateSettings as jest.Mock).mockRejectedValue(error);

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([
        resetError(),
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to update SCIM settings',
          errors: ['Save failed'],
        }),
      ]);
    });

    it('should handle validation errors (4xx status)', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const validationError = {
        status: 422,
        data: { message: 'Validation failed' },
        statusText: 'Unprocessable Entity',
      };
      (mockUpdateSettings as jest.Mock).mockRejectedValue(validationError);

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([
        resetError(),
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to update SCIM settings',
          errors: ['Validation failed'],
        }),
      ]);
    });

    it('should handle access denied errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const accessError = new Error('Access denied');
      (mockUpdateSettings as jest.Mock).mockRejectedValue(accessError);

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([
        resetError(),
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to update SCIM settings',
          errors: ['Access denied'],
        }),
      ]);
    });

    it('should handle update failure', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      (mockUpdateSettings as jest.Mock).mockResolvedValue(false);

      const dispatchedActions = await thunkTester({}).givenThunk(saveSCIMSettings).whenThunkIsDispatched(mockFormData);

      expect(dispatchedActions).toEqual([resetError(), settingsLoadingBegin(), settingsLoadingEnd()]);
    });
  });

  describe('resetSCIMSettings', () => {
    const mockSCIMSettings = {
      userSyncEnabled: false,
      groupSyncEnabled: false,
      rejectNonProvisionedUsers: false,
      source: SCIM_CONFIG_SOURCE.DATABASE,
    };

    it('should reset SCIM configuration successfully', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockDeleteSettings.mockResolvedValue(undefined);
      mockGetSettings.mockResolvedValue(mockSCIMSettings);

      const dispatchedActions = await thunkTester({}).givenThunk(resetSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoaded(mockSCIMSettings),
        setIsUpdated(true),
        settingsLoadingEnd(),
      ]);
      expect(mockDeleteSettings).toHaveBeenCalled();
      expect(mockGetSettings).toHaveBeenCalled();
    });

    it('should handle reset errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const error = new Error('Reset failed');
      mockDeleteSettings.mockRejectedValue(error);

      const dispatchedActions = await thunkTester({}).givenThunk(resetSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to reset SCIM configuration',
          errors: ['Reset failed'],
        }),
      ]);
    });

    it('should handle unknown reset errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      mockDeleteSettings.mockRejectedValue('Unknown error');

      const dispatchedActions = await thunkTester({}).givenThunk(resetSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions[2].payload.errors).toContain('Unknown error');
    });

    it('should handle FetchError with 404 status', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const notFoundError = {
        status: 404,
        data: { message: 'Configuration not found' },
        statusText: 'Not Found',
      };
      mockDeleteSettings.mockRejectedValue(notFoundError);

      const dispatchedActions = await thunkTester({}).givenThunk(resetSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to reset SCIM configuration',
          errors: ['Configuration not found'],
        }),
      ]);
    });

    it('should handle permission errors', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      const permissionError = new Error('Access denied');
      mockDeleteSettings.mockRejectedValue(permissionError);

      const dispatchedActions = await thunkTester({}).givenThunk(resetSCIMSettings).whenThunkIsDispatched();

      expect(dispatchedActions).toEqual([
        settingsLoadingBegin(),
        settingsLoadingEnd(),
        setError({
          message: 'Failed to reset SCIM configuration',
          errors: ['Access denied'],
        }),
      ]);
    });
  });

  describe('permission checks', () => {
    it('should check correct permissions for load', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      (mockGetSettings as jest.Mock).mockResolvedValue({});

      await thunkTester({}).givenThunk(loadSCIMSettings).whenThunkIsDispatched();

      expect(mockContextSrv.hasPermission).toHaveBeenCalledWith('settings:read');
    });

    it('should check correct permissions for save', async () => {
      mockContextSrv.hasPermission.mockReturnValue(true);
      (mockUpdateSettings as jest.Mock).mockResolvedValue(true);

      await thunkTester({})
        .givenThunk(saveSCIMSettings)
        .whenThunkIsDispatched({} as SCIMFormData);

      expect(mockContextSrv.hasPermission).toHaveBeenCalledWith('settings:write');
    });
  });
});
