import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type SCIMSettingsData } from '../../../types';
import { SCIM_CONFIG_SOURCE } from '../constants';
import { renderWithRedux, setupMocks, cleanupMocks, mockSCIMSettings, mockGrafanaRuntime } from '../testUtils';

import { SCIMSettingsForm } from './SCIMSettingsForm';

describe('SCIMSettingsForm', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    setupMocks();
    user = userEvent.setup();
    jest.clearAllMocks();
    mockGrafanaRuntime.config.featureToggles.enableSCIM = true;
  });

  afterEach(() => {
    cleanupMocks();
  });

  const defaultProps = {
    scimSettings: mockSCIMSettings,
    onSettingsChange: mockOnSettingsChange,
    disabled: false,
  };

  it('should render all form fields with correct labels', () => {
    renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    expect(screen.getByLabelText(/Enable User Sync/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enable Group Sync/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reject Non-Provisioned Users/i)).toBeInTheDocument();
  });

  it('should render field descriptions', () => {
    renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    expect(screen.getByText(/Allow your Identity Provider to create, update, and delete users/i)).toBeInTheDocument();
    expect(screen.getByText(/Allow your Identity Provider to create, update, and delete teams/i)).toBeInTheDocument();
    expect(screen.getByText(/When enabled, prevents non-SCIM provisioned users from signing in/i)).toBeInTheDocument();
  });

  it('should disable form fields when disabled prop is true', () => {
    renderWithRedux(<SCIMSettingsForm {...defaultProps} disabled={true} />);

    const switches = screen.getAllByRole('switch');
    switches.forEach((switchElement) => {
      expect(switchElement).toBeDisabled();
    });
  });

  it('should call onSettingsChange when form values change', async () => {
    renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Enable User Sync/i)).toBeInTheDocument();
    });

    const userSyncSwitch = screen.getByLabelText(/Enable User Sync/i);
    await user.click(userSyncSwitch);

    await waitFor(
      () => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith({
          userSyncEnabled: true,
          groupSyncEnabled: false,
          rejectNonProvisionedUsers: false,
        });
      },
      { timeout: 5000 }
    );
  });

  it('should not call onSettingsChange when form is not dirty', () => {
    renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    expect(mockOnSettingsChange).not.toHaveBeenCalled();
  });

  it('should reset form when scimSettings prop changes', async () => {
    const { rerender } = renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Enable User Sync/i)).toBeInTheDocument();
    });

    const newSettings: SCIMSettingsData = {
      ...mockSCIMSettings,
      userSyncEnabled: true,
    };

    rerender(<SCIMSettingsForm {...defaultProps} scimSettings={newSettings} />);

    await waitFor(() => {
      const userSyncSwitch = screen.getByLabelText(/Enable User Sync/i);
      expect(userSyncSwitch).toBeChecked();
    });
  });

  it('should not reset form when settings are the same', () => {
    const { rerender } = renderWithRedux(<SCIMSettingsForm {...defaultProps} />);

    rerender(<SCIMSettingsForm {...defaultProps} scimSettings={mockSCIMSettings} />);

    const userSyncSwitch = screen.getByLabelText(/Enable User Sync/i);
    expect(userSyncSwitch).not.toBeChecked();
  });

  it('should handle undefined settings gracefully', () => {
    const settingsWithUndefined: SCIMSettingsData = {
      userSyncEnabled: false,
      groupSyncEnabled: false,
      rejectNonProvisionedUsers: false,
      source: SCIM_CONFIG_SOURCE.FILE,
    };

    renderWithRedux(<SCIMSettingsForm {...defaultProps} scimSettings={settingsWithUndefined} />);

    expect(screen.getByLabelText(/Enable User Sync/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enable Group Sync/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reject Non-Provisioned Users/i)).toBeInTheDocument();
  });
});
