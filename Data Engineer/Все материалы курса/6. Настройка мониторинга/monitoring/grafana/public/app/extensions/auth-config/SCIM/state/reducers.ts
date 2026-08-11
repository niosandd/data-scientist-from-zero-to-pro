import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type SettingsError } from 'app/features/auth-config/types';

import { type SCIMConfigState, type SCIMSettingsData } from '../../../types';
import { SCIM_CONFIG_SOURCE } from '../constants';

export const defaultScimSettings: SCIMSettingsData = {
  userSyncEnabled: false,
  groupSyncEnabled: false,
  rejectNonProvisionedUsers: false,
  source: SCIM_CONFIG_SOURCE.FILE,
};

export const initialState: SCIMConfigState = {
  scimSettings: defaultScimSettings,
  isLoading: false,
  error: undefined,
  isUpdated: false,
};

const authConfigSCIMSlice = createSlice({
  name: 'scimConfig',
  initialState,
  reducers: {
    settingsLoaded: (state, action: PayloadAction<SCIMSettingsData>): SCIMConfigState => {
      return {
        ...state,
        scimSettings: action.payload,
        isLoading: false,
        error: undefined,
      };
    },

    settingsUpdated: (state, action: PayloadAction<SCIMSettingsData>): SCIMConfigState => {
      return {
        ...state,
        scimSettings: action.payload,
        isUpdated: true,
      };
    },
    settingsLoadingBegin: (state): SCIMConfigState => {
      return { ...state, isLoading: true, error: undefined };
    },
    settingsLoadingEnd: (state): SCIMConfigState => {
      return { ...state, isLoading: false };
    },
    setError: (state, action: PayloadAction<SettingsError>): SCIMConfigState => {
      return { ...state, error: action.payload, isLoading: false };
    },
    resetError: (state): SCIMConfigState => {
      return { ...state, error: undefined };
    },
    setIsUpdated: (state, action: PayloadAction<boolean>): SCIMConfigState => {
      return { ...state, isUpdated: action.payload };
    },
  },
});

export const {
  settingsLoaded,
  settingsUpdated,
  settingsLoadingBegin,
  settingsLoadingEnd,
  setError,
  resetError,
  setIsUpdated,
} = authConfigSCIMSlice.actions;

export const reducer = authConfigSCIMSlice.reducer;

export const authConfigSCIMReducer = {
  scimConfig: reducer,
};
