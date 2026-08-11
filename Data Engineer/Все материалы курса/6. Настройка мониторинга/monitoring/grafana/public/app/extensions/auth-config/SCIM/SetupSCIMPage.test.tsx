import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { config } from '@grafana/runtime';

import { type EnterpriseStoreState } from '../../types';

import { SetupSCIMPageUnconnected } from './SetupSCIMPage';
import { SCIM_CONFIG_SOURCE } from './constants';
import { renderWithRedux, setupMocks, cleanupMocks, mockSCIMSettings } from './testUtils';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    featureToggles: {
      ...jest.requireActual('@grafana/runtime').config.featureToggles,
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
}));

// Mock the child components
jest.mock('./components/SCIMConfigAlert', () => ({
  SCIMConfigAlert: ({ scimSettings, onResetClick, isResetting }: any) => {
    if (scimSettings?.source !== 'database') {
      return null;
    }
    return (
      <div data-testid="scim-config-alert">
        <button onClick={onResetClick} disabled={isResetting}>
          {isResetting ? 'Resetting...' : 'Reset Configuration'}
        </button>
      </div>
    );
  },
}));

jest.mock('./components/SCIMInfoCards', () => ({
  SCIMInfoCards: ({ domainInfo, stackId }: any) => (
    <div data-testid="scim-info-cards">
      <div>Domain: {domainInfo.domain}</div>
      <div>Stack ID: {stackId}</div>
    </div>
  ),
}));

jest.mock('./components/SCIMSettingsForm', () => ({
  SCIMSettingsForm: ({ onSettingsChange, disabled }: any) => (
    <div data-testid="scim-settings-form">
      <button onClick={() => onSettingsChange({ userSyncEnabled: true })} disabled={disabled}>
        Update Settings
      </button>
    </div>
  ),
}));

jest.mock('./components/SCIMSetupGuide', () => ({
  SCIMSetupGuide: ({ tenantUrl }: any) => (
    <div data-testid="scim-setup-guide">
      <div>Tenant URL: {tenantUrl}</div>
    </div>
  ),
}));

// Mock API functions
jest.mock('./utils/api', () => ({
  getDomain: jest.fn(() => ({ domain: 'grafana.net', subdomain: 'test' })),
  getBaseUrl: jest.fn(() => 'https://test.grafana.net/tenant'),
  getStackId: jest.fn(() => '12345'),
}));

// Mock Redux actions
jest.mock('./state/actions', () => ({
  loadSCIMSettings: jest.fn(() => ({ type: 'LOAD_SCIM_SETTINGS' })),
  saveSCIMSettingsDebounced: jest.fn(() => ({ type: 'SAVE_SCIM_SETTINGS' })),
  resetSCIMSettings: jest.fn(() => ({ type: 'RESET_SCIM_SETTINGS' })),
  resetError: jest.fn(() => ({ type: 'RESET_ERROR' })),
}));

// Mock useAppNotification
const mockNotifyApp = {
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
};

jest.mock('app/core/copy/appNotification', () => ({
  useAppNotification: jest.fn(() => mockNotifyApp),
}));

describe('SetupSCIMPage', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let originalFeatureToggles: any;

  beforeEach(() => {
    setupMocks();
    user = userEvent.setup();
    jest.clearAllMocks();

    // Clear notification mock
    mockNotifyApp.success.mockClear();
    mockNotifyApp.warning.mockClear();
    mockNotifyApp.error.mockClear();

    originalFeatureToggles = { ...config.featureToggles };

    config.featureToggles.enableSCIM = true;
  });

  afterEach(() => {
    cleanupMocks();

    config.featureToggles = originalFeatureToggles;
  });

  const createMockStoreState = (overrides: Partial<EnterpriseStoreState['scimConfig']> = {}): EnterpriseStoreState =>
    ({
      scimConfig: {
        scimSettings: mockSCIMSettings,
        isLoading: false,
        error: null,
        isUpdated: false,
        ...overrides,
      },
    }) as EnterpriseStoreState;

  const defaultProps = {
    scimConfig: createMockStoreState().scimConfig,
  };

  it('should render feature disabled message when SCIM feature toggle is disabled', () => {
    config.featureToggles.enableSCIM = false;

    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    expect(screen.getByText(/SCIM Feature Disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/The SCIM feature is not enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/enableSCIM/i)).toBeInTheDocument();
    expect(screen.getByText(/feature toggle/i)).toBeInTheDocument();
  });

  it('should render main content when SCIM feature toggle is enabled', async () => {
    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/SCIM Configuration/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Read more about SCIM provisioning/i)).toBeInTheDocument();
  });

  it('should render all child components', async () => {
    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('scim-info-cards')).toBeInTheDocument();
    });
    expect(screen.getByTestId('scim-settings-form')).toBeInTheDocument();
    expect(screen.getByTestId('scim-setup-guide')).toBeInTheDocument();
  });

  it('should render SCIMConfigAlert when source is DATABASE', async () => {
    const stateWithStaticSettings = createMockStoreState({
      scimSettings: { ...mockSCIMSettings, source: SCIM_CONFIG_SOURCE.DATABASE },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithStaticSettings.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('scim-config-alert')).toBeInTheDocument();
    });
  });

  it('should not render SCIMConfigAlert when source is FILE', async () => {
    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/SCIM Configuration/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('scim-config-alert')).not.toBeInTheDocument();
  });

  it('should render error alert when error is present', async () => {
    const stateWithError = createMockStoreState({
      error: { message: 'Test error message', errors: ['Error detail 1', 'Error detail 2'] },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithError.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
    expect(screen.getByText('Error detail 1')).toBeInTheDocument();
    expect(screen.getByText('Error detail 2')).toBeInTheDocument();
  });

  it('should show app notification when isUpdated is true', async () => {
    const stateWithUpdate = createMockStoreState({
      isUpdated: true,
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithUpdate.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/SCIM Configuration/i)).toBeInTheDocument();
    });

    // Verify that the success notification was called with the correct parameters
    expect(mockNotifyApp.success).toHaveBeenCalledWith(
      'Settings Updated',
      'SCIM settings have been successfully updated.'
    );
  });

  it('should not show app notification when isUpdated is false', async () => {
    const stateWithoutUpdate = createMockStoreState({
      isUpdated: false,
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithoutUpdate.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/SCIM Configuration/i)).toBeInTheDocument();
    });

    // Verify that the success notification was NOT called
    expect(mockNotifyApp.success).not.toHaveBeenCalled();
  });

  it('should show loading state', async () => {
    const stateWithLoading = createMockStoreState({
      isLoading: true,
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithLoading.scimConfig} dispatch={jest.fn()} />);

    expect(screen.queryByTestId('scim-settings-form')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Loading ...')).toBeInTheDocument();
    });
  });

  it('should handle settings form changes', async () => {
    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update Settings/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /Update Settings/i });
    await user.click(updateButton);
  });

  it('should handle reset configuration', async () => {
    const stateWithStaticSettings = createMockStoreState({
      scimSettings: { ...mockSCIMSettings, source: SCIM_CONFIG_SOURCE.DATABASE },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithStaticSettings.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Configuration/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Reset Configuration/i });
    await user.click(resetButton);

    expect(screen.getByText(/Reset SCIM Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to reset/i)).toBeInTheDocument();
  });

  it('should handle reset confirmation', async () => {
    const stateWithStaticSettings = createMockStoreState({
      scimSettings: { ...mockSCIMSettings, source: SCIM_CONFIG_SOURCE.DATABASE },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithStaticSettings.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Configuration/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Reset Configuration/i });
    await user.click(resetButton);

    const confirmButton = screen.getByRole('dialog').querySelector('button[type="button"]:last-child');
    await user.click(confirmButton!);

    expect(screen.queryByText(/Are you sure you want to reset/i)).not.toBeInTheDocument();
  });

  it('should handle reset cancellation', async () => {
    const stateWithStaticSettings = createMockStoreState({
      scimSettings: { ...mockSCIMSettings, source: SCIM_CONFIG_SOURCE.DATABASE },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithStaticSettings.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Configuration/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Reset Configuration/i });
    await user.click(resetButton);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByText(/Are you sure you want to reset/i)).not.toBeInTheDocument();
  });

  it('should handle error dismissal', async () => {
    const stateWithError = createMockStoreState({
      error: { message: 'Test error message', errors: [] },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithError.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    const errorAlert = screen.getByText('Test error message');
    expect(errorAlert).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /Close alert/i });
    await user.click(removeButton);
  });

  it('should display API error messages correctly', async () => {
    const stateWithApiError = createMockStoreState({
      error: {
        message: 'Failed to update SCIM configuration: Validation failed',
        errors: ['Validation failed'],
      },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithApiError.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to update SCIM configuration: Validation failed')).toBeInTheDocument();
    });

    // Should also display individual error items
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
  });

  it('should display access denied error correctly', async () => {
    const stateWithAccessError = createMockStoreState({
      error: {
        message: 'Access denied',
        errors: [],
      },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithAccessError.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('should display system error messages correctly', async () => {
    const stateWithSystemError = createMockStoreState({
      error: {
        message: 'Failed to fetch SCIM configuration: Internal server error',
        errors: ['Internal server error'],
      },
    });

    renderWithRedux(<SetupSCIMPageUnconnected scimConfig={stateWithSystemError.scimConfig} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch SCIM configuration: Internal server error')).toBeInTheDocument();
    });
  });

  it('should load data on mount', async () => {
    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('scim-info-cards')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock console.error to prevent test failure
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock API functions to throw errors
    const { getStackId, getBaseUrl } = require('./utils/api');
    getStackId.mockImplementationOnce(() => {
      throw new Error('API Error');
    });
    getBaseUrl.mockImplementationOnce(() => {
      throw new Error('API Error');
    });

    renderWithRedux(<SetupSCIMPageUnconnected {...defaultProps} dispatch={jest.fn()} />);

    // Wait for component to render despite API errors
    await waitFor(() => {
      expect(screen.getByText(/SCIM Configuration/i)).toBeInTheDocument();
    });

    // Component should still render even if API calls fail
    expect(screen.getByTestId('scim-info-cards')).toBeInTheDocument();

    // Restore console.error
    consoleSpy.mockRestore();
  });
});
