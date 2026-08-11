import { type SettingsError } from 'app/features/auth-config/types';

import { type SCIMConfigSource } from '../auth-config/SCIM/constants';

export interface SCIMConfigState {
  scimSettings: SCIMSettingsData;
  isLoading: boolean;
  error?: SettingsError;
  isUpdated: boolean;
}

export interface SCIMUser {
  id: number;
  uid: string;
  name: string;
  email: string;
  login: string;
  lastSeenAtAge?: string;
  isDisabled: boolean;
}

export interface SCIMFormData {
  userSyncEnabled: boolean;
  groupSyncEnabled: boolean;
  rejectNonProvisionedUsers: boolean;
}

export interface DomainInfo {
  domain: string;
  subdomain: string;
}

export interface SCIMSettingsData {
  userSyncEnabled: boolean;
  groupSyncEnabled: boolean;
  rejectNonProvisionedUsers: boolean;
  source: SCIMConfigSource;
}
