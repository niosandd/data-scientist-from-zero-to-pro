import { render, type RenderOptions } from '@testing-library/react';
import type React from 'react';
import { TestProvider } from 'test/helpers/TestProvider';

import { addRootReducer } from 'app/store/configureStore';

import { type SCIMSettingsData } from '../../types';

import { SCIM_CONFIG_SOURCE } from './constants';
import { authConfigSCIMReducer } from './state/reducers';

// Mock data for testing
export const mockSCIMSettings: SCIMSettingsData = {
  userSyncEnabled: false,
  groupSyncEnabled: false,
  rejectNonProvisionedUsers: false,
  source: SCIM_CONFIG_SOURCE.FILE,
};

export const mockSCIMSettingsWithStatic: SCIMSettingsData = {
  userSyncEnabled: true,
  groupSyncEnabled: true,
  rejectNonProvisionedUsers: true,
  source: SCIM_CONFIG_SOURCE.DATABASE,
};

export const mockDomainInfo = {
  domain: 'grafana.net',
  subdomain: 'test-stack',
};

// Mock Grafana runtime
export const mockGrafanaRuntime = {
  config: {
    featureToggles: {
      enableSCIM: true,
    },
    appSubUrl: 'https://test.grafana.net',
    namespace: 'stacks-12345',
  },
  getBackendSrv: jest.fn(),
  locationService: {
    push: jest.fn(),
    reload: jest.fn(),
    getHistory: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      go: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      block: jest.fn(),
      listen: jest.fn(),
      location: { pathname: '/', search: '', hash: '', state: null },
    })),
  },
};

// Mock core services
const mockContextSrv = {
  hasPermission: jest.fn().mockReturnValue(true),
};

// Custom render function with Redux store
export const renderWithRedux = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  addRootReducer(authConfigSCIMReducer);

  return render(ui, {
    wrapper: TestProvider,
    ...options,
  });
};

// Setup function for common mocks
export const setupMocks = () => {
  jest.clearAllMocks();

  // Mock @grafana/runtime
  jest.doMock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    config: {
      ...jest.requireActual('@grafana/runtime').config,
      ...mockGrafanaRuntime.config,
    },
    getBackendSrv: mockGrafanaRuntime.getBackendSrv,
    locationService: mockGrafanaRuntime.locationService,
  }));

  // Mock app/core/services/context_srv
  jest.doMock('app/core/services/context_srv', () => ({
    contextSrv: mockContextSrv,
  }));
};

// Cleanup function
export const cleanupMocks = () => {
  jest.restoreAllMocks();
};
