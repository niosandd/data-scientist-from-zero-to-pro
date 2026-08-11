import { type SettingsError } from 'app/features/auth-config/types';

import { type SCIMSettingsData } from '../../../types';
import { SCIM_CONFIG_SOURCE } from '../constants';

import {
  reducer,
  settingsLoaded,
  settingsUpdated,
  settingsLoadingBegin,
  settingsLoadingEnd,
  setError,
  resetError,
  setIsUpdated,
  initialState,
  defaultScimSettings,
} from './reducers';

describe('SCIM Reducers', () => {
  const mockSCIMSettings: SCIMSettingsData = {
    userSyncEnabled: true,
    groupSyncEnabled: false,
    rejectNonProvisionedUsers: true,
    source: SCIM_CONFIG_SOURCE.DATABASE,
  };

  const mockError: SettingsError = {
    message: 'Test error message',
    errors: ['Error detail 1', 'Error detail 2'],
  };

  describe('settingsLoaded', () => {
    it('should set scimSettings and clear loading state', () => {
      const state = {
        ...initialState,
        isLoading: true,
        error: mockError,
      };

      const result = reducer(state, settingsLoaded(mockSCIMSettings));

      expect(result).toEqual({
        ...initialState,
        scimSettings: mockSCIMSettings,
        isLoading: false,
        error: undefined,
      });
    });

    it('should handle empty settings', () => {
      const emptySettings: SCIMSettingsData = {
        userSyncEnabled: false,
        groupSyncEnabled: false,
        rejectNonProvisionedUsers: false,
        source: SCIM_CONFIG_SOURCE.FILE,
      };

      const result = reducer(initialState, settingsLoaded(emptySettings));

      expect(result).toEqual({
        ...initialState,
        scimSettings: emptySettings,
        isLoading: false,
        error: undefined,
      });
    });
  });

  describe('settingsUpdated', () => {
    it('should update scimSettings and set isUpdated to true', () => {
      const result = reducer(initialState, settingsUpdated(mockSCIMSettings));

      expect(result).toEqual({
        ...initialState,
        scimSettings: mockSCIMSettings,
        isUpdated: true,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithError = {
        ...initialState,
        error: mockError,
        isLoading: true,
      };

      const result = reducer(stateWithError, settingsUpdated(mockSCIMSettings));

      expect(result).toEqual({
        ...stateWithError,
        scimSettings: mockSCIMSettings,
        isUpdated: true,
      });
    });
  });

  describe('settingsLoadingBegin', () => {
    it('should set isLoading to true and clear error', () => {
      const state = {
        ...initialState,
        error: mockError,
      };
      const result = reducer(state, settingsLoadingBegin());

      expect(result).toEqual({
        ...initialState,
        isLoading: true,
        error: undefined,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithSettings = {
        ...initialState,
        scimSettings: mockSCIMSettings,
        isUpdated: true,
      };

      const result = reducer(stateWithSettings, settingsLoadingBegin());

      expect(result).toEqual({
        ...stateWithSettings,
        isLoading: true,
        error: undefined,
      });
    });
  });

  describe('settingsLoadingEnd', () => {
    it('should set isLoading to false', () => {
      const state = {
        ...initialState,
        isLoading: true,
      };
      const result = reducer(state, settingsLoadingEnd());

      expect(result).toEqual({
        ...initialState,
        isLoading: false,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithError = {
        ...initialState,
        error: mockError,
        scimSettings: mockSCIMSettings,
      };

      const result = reducer(stateWithError, settingsLoadingEnd());

      expect(result).toEqual({
        ...stateWithError,
        isLoading: false,
      });
    });
  });

  describe('setError', () => {
    it('should set error and set isLoading to false', () => {
      const state = {
        ...initialState,
        isLoading: true,
      };
      const result = reducer(state, setError(mockError));

      expect(result).toEqual({
        ...initialState,
        error: mockError,
        isLoading: false,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithSettings = {
        ...initialState,
        scimSettings: mockSCIMSettings,
        isUpdated: true,
      };

      const result = reducer(stateWithSettings, setError(mockError));

      expect(result).toEqual({
        ...stateWithSettings,
        error: mockError,
        isLoading: false,
      });
    });
  });

  describe('resetError', () => {
    it('should clear error', () => {
      const state = {
        ...initialState,
        error: mockError,
      };
      const result = reducer(state, resetError());

      expect(result).toEqual({
        ...initialState,
        error: undefined,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithSettings = {
        ...initialState,
        scimSettings: mockSCIMSettings,
        isLoading: true,
        isUpdated: true,
      };

      const result = reducer(stateWithSettings, resetError());

      expect(result).toEqual({
        ...stateWithSettings,
        error: undefined,
      });
    });
  });

  describe('setIsUpdated', () => {
    it('should set isUpdated to true', () => {
      const result = reducer(initialState, setIsUpdated(true));

      expect(result).toEqual({
        ...initialState,
        isUpdated: true,
      });
    });

    it('should set isUpdated to false', () => {
      const state = {
        ...initialState,
        isUpdated: true,
      };
      const result = reducer(state, setIsUpdated(false));

      expect(result).toEqual({
        ...initialState,
        isUpdated: false,
      });
    });

    it('should preserve other state properties', () => {
      const stateWithError = {
        ...initialState,
        error: mockError,
        scimSettings: mockSCIMSettings,
        isLoading: true,
      };

      const result = reducer(stateWithError, setIsUpdated(true));

      expect(result).toEqual({
        ...stateWithError,
        isUpdated: true,
      });
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      expect(initialState).toEqual({
        scimSettings: defaultScimSettings,
        isLoading: false,
        error: undefined,
        isUpdated: false,
      });
    });

    it('should have correct default SCIM settings', () => {
      expect(defaultScimSettings).toEqual({
        userSyncEnabled: false,
        groupSyncEnabled: false,
        rejectNonProvisionedUsers: false,
        source: SCIM_CONFIG_SOURCE.FILE,
      });
    });
  });

  describe('state immutability', () => {
    it('should not mutate original state', () => {
      const originalState = { ...initialState };

      const result = reducer(originalState, settingsLoaded(mockSCIMSettings));

      expect(result).toEqual({
        ...initialState,
        scimSettings: mockSCIMSettings,
        isLoading: false,
        error: undefined,
      });

      expect(originalState).toEqual(initialState);
    });

    it('should create new state objects for nested properties', () => {
      const originalState = { ...initialState };

      const result = reducer(originalState, settingsLoaded(mockSCIMSettings));

      // The scimSettings object should be a new reference
      expect(result.scimSettings).not.toBe(originalState.scimSettings);
    });
  });
});
