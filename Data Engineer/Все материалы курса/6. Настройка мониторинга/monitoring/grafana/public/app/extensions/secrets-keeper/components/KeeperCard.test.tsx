import { render, screen, userEvent } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

import { type KeeperListItem } from '../types';

import { KeeperCard } from './KeeperCard';

jest.mock('app/core/services/context_srv');

const mockContextSrv = jest.mocked(contextSrv);

const mockDeleteKeeper = jest.fn();
const mockUseDeleteKeeper = jest.fn().mockReturnValue({ deleteKeeper: mockDeleteKeeper, isLoading: false });

jest.mock('../hooks/useDeleteKeeper', () => ({
  useDeleteKeeper: () => mockUseDeleteKeeper(),
}));

const mockActivateOnClick = jest.fn();
const mockUseActivateFlow = jest.fn().mockReturnValue({
  hasPermission: true,
  onClick: mockActivateOnClick,
  modal: null,
});

jest.mock('../hooks/useActivateFlow', () => ({
  useActivateFlow: (args: unknown) => mockUseActivateFlow(args),
}));

jest.mock('@grafana/runtime', () => {
  const actual = jest.requireActual('@grafana/runtime');
  return {
    ...actual,
    getAppEvents: () => ({ publish: jest.fn() }),
  };
});

describe('KeeperCard', () => {
  const mockKeeper: KeeperListItem = {
    name: 'aws-prod',
    type: 'aws',
    description: 'Production AWS Secrets Manager',
    isActive: false,
    config: 'us-east-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  };

  beforeEach(() => {
    mockContextSrv.hasPermission.mockReturnValue(true);
    mockDeleteKeeper.mockResolvedValue(undefined);
    mockUseActivateFlow.mockReturnValue({
      hasPermission: true,
      onClick: mockActivateOnClick,
      modal: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders keeper name', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.getByText('aws-prod')).toBeInTheDocument();
  });

  it('renders keeper type label', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.getByText('AWS Secrets Manager')).toBeInTheDocument();
  });

  it('renders keeper configuration', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('renders keeper description when provided', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.getByText('Production AWS Secrets Manager')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const keeperWithoutDescription = { ...mockKeeper, description: '' };
    render(<KeeperCard keeper={keeperWithoutDescription} />);
    expect(screen.queryByText('Production AWS Secrets Manager')).not.toBeInTheDocument();
  });

  it('shows active badge when keeper is active', () => {
    const activeKeeper = { ...mockKeeper, isActive: true };
    render(<KeeperCard keeper={activeKeeper} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not show active badge when keeper is inactive', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('renders edit link pointing to edit page when user has write permission', () => {
    render(<KeeperCard keeper={mockKeeper} />);
    const link = screen.getByTestId('keeper-edit');
    expect(link).toHaveAttribute('href', '/admin/secrets/keepers/aws-prod/edit');
  });

  it('hides edit link when user lacks write permission', () => {
    mockContextSrv.hasPermission.mockImplementation(
      (action: string) => action !== AccessControlAction.SecretKeepersWrite
    );

    render(<KeeperCard keeper={mockKeeper} />);
    expect(screen.queryByTestId('keeper-edit')).not.toBeInTheDocument();
  });

  it('handles missing config gracefully', () => {
    const keeperWithoutConfig = { ...mockKeeper, config: '' };
    render(<KeeperCard keeper={keeperWithoutConfig} />);
    expect(screen.queryByText('•')).not.toBeInTheDocument();
    expect(screen.queryByText('us-east-1')).not.toBeInTheDocument();
  });

  describe('keeper type labels', () => {
    it('renders AWS Secrets Manager', () => {
      const keeper = { ...mockKeeper, type: 'aws' as const };
      render(<KeeperCard keeper={keeper} />);
      expect(screen.getByText('AWS Secrets Manager')).toBeInTheDocument();
    });

    it('renders System (Grafana)', () => {
      const keeper = { ...mockKeeper, type: 'system' as const };
      render(<KeeperCard keeper={keeper} />);
      expect(screen.getByText('System (Grafana)')).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    afterEach(() => {
      mockUseDeleteKeeper.mockReturnValue({ deleteKeeper: mockDeleteKeeper, isLoading: false });
    });

    it('disables confirm button while deletion is in progress', async () => {
      mockUseDeleteKeeper.mockReturnValue({ deleteKeeper: mockDeleteKeeper, isLoading: true });

      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('keeper-delete'));

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });

    it('shows delete button when user has delete permission', () => {
      render(<KeeperCard keeper={mockKeeper} />);
      expect(screen.getByTestId('keeper-delete')).toBeInTheDocument();
    });

    it('hides delete button when user lacks delete permission', () => {
      mockContextSrv.hasPermission.mockImplementation(
        (action: string) => action !== AccessControlAction.SecretKeepersDelete
      );

      render(<KeeperCard keeper={mockKeeper} />);
      expect(screen.queryByTestId('keeper-delete')).not.toBeInTheDocument();
    });

    it('opens confirmation modal when delete button is clicked', async () => {
      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('keeper-delete'));

      expect(screen.getByText('Delete keeper')).toBeInTheDocument();
    });

    it('calls deleteKeeper when confirmed', async () => {
      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('keeper-delete'));

      const confirmInput = screen.getByPlaceholderText(/type "delete" to confirm/i);
      await user.type(confirmInput, 'delete');
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(mockDeleteKeeper).toHaveBeenCalledWith('aws-prod');
    });

    it('shows error inline in modal when delete fails', async () => {
      mockDeleteKeeper.mockRejectedValue(new Error('Cannot delete active keeper'));

      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('keeper-delete'));

      const confirmInput = screen.getByPlaceholderText(/type "delete" to confirm/i);
      await user.type(confirmInput, 'delete');
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByText('Failed to delete keeper')).toBeInTheDocument();
      expect(screen.getByText('Cannot delete active keeper')).toBeInTheDocument();
      // Modal stays open
      expect(screen.getByText('Delete keeper')).toBeInTheDocument();
    });

    it('clears error when modal is dismissed and reopened', async () => {
      mockDeleteKeeper.mockRejectedValueOnce(new Error('Network error'));
      mockDeleteKeeper.mockResolvedValue(undefined);

      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      // Trigger error
      await user.click(screen.getByTestId('keeper-delete'));
      const confirmInput = screen.getByPlaceholderText(/type "delete" to confirm/i);
      await user.type(confirmInput, 'delete');
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(await screen.findByText('Network error')).toBeInTheDocument();

      // Dismiss and reopen
      await user.click(screen.getByText('Cancel'));
      await user.click(screen.getByTestId('keeper-delete'));

      // Error should be cleared
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });

    it('does not call deleteKeeper when modal is dismissed', async () => {
      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('keeper-delete'));
      await user.click(screen.getByText('Cancel'));

      expect(mockDeleteKeeper).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('shows activate button when keeper is inactive and user has permission', () => {
      render(<KeeperCard keeper={mockKeeper} />);
      expect(screen.getByTestId('keeper-activate')).toBeInTheDocument();
    });

    it('hides activate button when keeper is active and shows the active badge', () => {
      render(<KeeperCard keeper={{ ...mockKeeper, isActive: true }} />);
      expect(screen.queryByTestId('keeper-activate')).not.toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders the activate modal returned by useActivateFlow', () => {
      mockUseActivateFlow.mockReturnValue({
        hasPermission: true,
        onClick: mockActivateOnClick,
        modal: <div data-testid="mock-activate-modal" />,
      });
      render(<KeeperCard keeper={mockKeeper} />);
      expect(screen.getByTestId('mock-activate-modal')).toBeInTheDocument();
    });

    it('hides activate button when user lacks write permission', () => {
      mockUseActivateFlow.mockReturnValue({
        hasPermission: false,
        onClick: mockActivateOnClick,
        modal: null,
      });
      render(<KeeperCard keeper={mockKeeper} />);
      expect(screen.queryByTestId('keeper-activate')).not.toBeInTheDocument();
    });

    it('passes keeper name, isActive, and onSuccess to useActivateFlow', () => {
      render(<KeeperCard keeper={{ ...mockKeeper, isActive: false }} />);
      expect(mockUseActivateFlow).toHaveBeenCalledWith({
        name: 'aws-prod',
        isActive: false,
        onSuccess: expect.any(Function),
      });
    });

    it('calls onClick when activate button is clicked', async () => {
      render(<KeeperCard keeper={mockKeeper} />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('keeper-activate'));
      expect(mockActivateOnClick).toHaveBeenCalled();
    });
  });
});
