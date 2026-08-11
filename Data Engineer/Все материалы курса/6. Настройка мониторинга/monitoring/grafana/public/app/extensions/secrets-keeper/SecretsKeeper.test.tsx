import { render, screen, userEvent } from 'test/test-utils';

import { SecretsKeeper } from './SecretsKeeper';
import { type KeeperListItem } from './types';

const mockUseKeepers = jest.fn();

jest.mock('./hooks/useKeepers', () => ({
  useKeepers: () => mockUseKeepers(),
}));

jest.mock('./components/KeeperCard', () => ({
  KeeperCard: ({ keeper }: { keeper: KeeperListItem }) => (
    <div data-testid={`keeper-card-${keeper.name}`}>{keeper.name}</div>
  ),
}));

const mockRevertOnClick = jest.fn();
const mockUseActivateFlow = jest.fn().mockReturnValue({
  hasPermission: true,
  disabled: false,
  tooltip: undefined,
  onClick: mockRevertOnClick,
  modal: null,
});

jest.mock('./hooks/useActivateFlow', () => ({
  useActivateFlow: (args: unknown) => mockUseActivateFlow(args),
}));

describe('SecretsKeeper', () => {
  const mockKeepers: KeeperListItem[] = [
    {
      name: 'aws-prod',
      type: 'aws',
      description: 'Production AWS Secrets Manager',
      isActive: true,
      config: 'us-east-1',
    },
    {
      name: 'aws-staging',
      type: 'aws',
      description: 'Staging environment',
      isActive: false,
      config: 'us-west-2',
    },
  ];

  beforeEach(() => {
    mockUseKeepers.mockReturnValue({
      keepers: mockKeepers,
      isLoading: false,
      error: undefined,
      activeKeeper: mockKeepers[0],
    });
    mockUseActivateFlow.mockReturnValue({
      hasPermission: true,
      disabled: false,
      tooltip: undefined,
      onClick: mockRevertOnClick,
      modal: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders page title', () => {
    render(<SecretsKeeper />);
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });

  // Note: Tabs are now rendered by Page component via pageNav.children
  // Test removed as it requires complex Page/navigation mocking
  // Tab functionality tested via manual/E2E testing

  it('displays active keeper information', () => {
    render(<SecretsKeeper />);
    expect(screen.getByText(/active keeper: aws-prod \(aws\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('keeper-card-aws-prod')).toBeInTheDocument();
  });

  it('renders all keepers in list', () => {
    render(<SecretsKeeper />);
    expect(screen.getByTestId('keeper-card-aws-prod')).toBeInTheDocument();
    expect(screen.getByTestId('keeper-card-aws-staging')).toBeInTheDocument();
  });

  it('renders only the expected keepers without extras', () => {
    render(<SecretsKeeper />);
    const keeperCards = screen.queryAllByTestId(/keeper-card-/);
    expect(keeperCards).toHaveLength(2);
    expect(keeperCards[0]).toHaveTextContent('aws-prod');
    expect(keeperCards[1]).toHaveTextContent('aws-staging');
  });

  it('shows Add keeper button in header', () => {
    render(<SecretsKeeper />);
    expect(screen.getByRole('link', { name: /add keeper/i })).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseKeepers.mockReturnValue({
      keepers: [],
      isLoading: true,
      error: undefined,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.queryByTestId(/keeper-card/)).not.toBeInTheDocument();
  });

  it('displays error state when error occurs', () => {
    // useKeepers returns Error | undefined; component renders error?.message via optional chaining
    const mockError = new Error('Failed to load keepers');
    mockUseKeepers.mockReturnValue({
      keepers: [],
      isLoading: false,
      error: mockError,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.getByText('Error loading keepers')).toBeInTheDocument();
    expect(screen.getByText('Failed to load keepers')).toBeInTheDocument();
  });

  it('does not show error state when no error', () => {
    render(<SecretsKeeper />);
    expect(screen.queryByText('Error loading keepers')).not.toBeInTheDocument();
  });

  it('displays empty state when no keepers configured', () => {
    mockUseKeepers.mockReturnValue({
      keepers: [],
      isLoading: false,
      error: undefined,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.getByText('No keepers configured')).toBeInTheDocument();
    expect(
      screen.getByText(/secrets keepers allow you to store grafana secrets in external services/i)
    ).toBeInTheDocument();
  });

  it('shows Add your first keeper button in empty state', () => {
    mockUseKeepers.mockReturnValue({
      keepers: [],
      isLoading: false,
      error: undefined,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.getByRole('link', { name: /add your first keeper/i })).toBeInTheDocument();
  });

  it('shows "System (GSM)" as the active keeper when none is explicitly active', () => {
    mockUseKeepers.mockReturnValue({
      keepers: mockKeepers.map((k) => ({ ...k, isActive: false })),
      isLoading: false,
      error: undefined,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.getByText(/active keeper: system \(gsm\)/i)).toBeInTheDocument();
  });

  it('does not show keeper list when empty', () => {
    mockUseKeepers.mockReturnValue({
      keepers: [],
      isLoading: false,
      error: undefined,
      activeKeeper: undefined,
    });

    render(<SecretsKeeper />);
    expect(screen.queryByTestId(/keeper-card/)).not.toBeInTheDocument();
  });

  describe('revert to system keeper', () => {
    it('shows the revert button when a non-system keeper is active', () => {
      render(<SecretsKeeper />);
      expect(screen.getByTestId('revert-to-system-button')).toBeInTheDocument();
    });

    it('hides the revert button when the system keeper is active', () => {
      const systemKeeper: KeeperListItem = {
        name: 'system',
        type: 'system',
        description: '',
        isActive: true,
        config: '',
      };
      mockUseKeepers.mockReturnValue({
        keepers: [systemKeeper],
        isLoading: false,
        error: undefined,
        activeKeeper: systemKeeper,
      });
      render(<SecretsKeeper />);
      expect(screen.queryByTestId('revert-to-system-button')).not.toBeInTheDocument();
    });

    it('hides the revert button when no keeper is active', () => {
      mockUseKeepers.mockReturnValue({
        keepers: mockKeepers.map((k) => ({ ...k, isActive: false })),
        isLoading: false,
        error: undefined,
        activeKeeper: undefined,
      });
      render(<SecretsKeeper />);
      expect(screen.queryByTestId('revert-to-system-button')).not.toBeInTheDocument();
    });

    it('hides the revert button when user lacks write permission', () => {
      mockUseActivateFlow.mockReturnValue({
        hasPermission: false,
        disabled: false,
        tooltip: undefined,
        onClick: mockRevertOnClick,
        modal: null,
      });
      render(<SecretsKeeper />);
      expect(screen.queryByTestId('revert-to-system-button')).not.toBeInTheDocument();
    });

    it('calls the flow onClick when the revert button is clicked', async () => {
      render(<SecretsKeeper />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('revert-to-system-button'));
      expect(mockRevertOnClick).toHaveBeenCalled();
    });
  });
});
