import { render, screen, userEvent, waitFor } from 'test/test-utils';

import { AppEvents } from '@grafana/data';

import { ActivateKeeperModal } from './ActivateKeeperModal';

const mockActivateKeeper = jest.fn();
const mockUseActivateKeeper = jest.fn().mockReturnValue({ activateKeeper: mockActivateKeeper, isLoading: false });

jest.mock('../hooks/useActivateKeeper', () => ({
  useActivateKeeper: () => mockUseActivateKeeper(),
}));

const mockPublish = jest.fn();
jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getAppEvents: () => ({ publish: mockPublish }),
}));

describe('ActivateKeeperModal', () => {
  const onDismiss = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
    mockUseActivateKeeper.mockReturnValue({ activateKeeper: mockActivateKeeper, isLoading: false });
  });

  describe('activate mode', () => {
    it('renders the activate title and primary confirm button', () => {
      render(<ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);
      expect(screen.getByText('Activate keeper')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });

    it('activates the target keeper on confirm and fires success toast', async () => {
      mockActivateKeeper.mockResolvedValue(undefined);
      render(<ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);

      await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

      await waitFor(() => {
        expect(mockActivateKeeper).toHaveBeenCalledWith('aws-prod');
      });
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({ type: AppEvents.alertSuccess.name }));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('surfaces error from activation without dismissing', async () => {
      mockActivateKeeper.mockRejectedValue(new Error('Keeper has an invalid AWS region'));
      render(<ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);

      await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to activate keeper')).toBeInTheDocument();
      });
      expect(screen.getByText('Keeper has an invalid AWS region')).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('deactivate mode', () => {
    it('renders the revert title and destructive confirm button', () => {
      render(<ActivateKeeperModal mode="deactivate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);
      expect(screen.getByText('Revert to system keeper')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Revert to System Keeper' })).toBeInTheDocument();
    });

    it('activates the system keeper on confirm regardless of keeperName prop', async () => {
      mockActivateKeeper.mockResolvedValue(undefined);
      render(<ActivateKeeperModal mode="deactivate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);

      await userEvent.click(screen.getByRole('button', { name: 'Revert to System Keeper' }));

      await waitFor(() => {
        expect(mockActivateKeeper).toHaveBeenCalledWith('system');
      });
      expect(mockPublish).toHaveBeenCalledWith(expect.objectContaining({ type: AppEvents.alertSuccess.name }));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('surfaces error with deactivate error title', async () => {
      mockActivateKeeper.mockRejectedValue(new Error('Backend unreachable'));
      render(<ActivateKeeperModal mode="deactivate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);

      await userEvent.click(screen.getByRole('button', { name: 'Revert to System Keeper' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to revert to system keeper')).toBeInTheDocument();
      });
    });
  });

  it('clears error state when dismissed and reopened', async () => {
    mockActivateKeeper.mockRejectedValue(new Error('Server error'));
    const { rerender } = render(
      <ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Activate' }));
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(<ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);
    expect(screen.queryByText('Server error')).not.toBeInTheDocument();
  });

  it('disables confirm button while loading', () => {
    mockUseActivateKeeper.mockReturnValue({ activateKeeper: mockActivateKeeper, isLoading: true });
    render(<ActivateKeeperModal mode="activate" keeperName="aws-prod" isOpen={true} onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: 'Activate' })).toBeDisabled();
  });
});
