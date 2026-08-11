import { render, renderHook, screen, userEvent } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';

import { useActivateFlow, type UseActivateFlowArgs } from './useActivateFlow';

jest.mock('app/core/services/context_srv');

const mockHasPermission = jest.mocked(contextSrv).hasPermission;

// Consumer component used to test onClick behavior — the hook's `modal` JSX
// updates on state change, so caller and modal must live in the same tree.
function FlowConsumer(props: UseActivateFlowArgs) {
  const flow = useActivateFlow(props);
  return (
    <>
      <button data-testid="trigger" onClick={flow.onClick}>
        open
      </button>
      {flow.modal}
    </>
  );
}

// Stub the modal so the hook test doesn't need RTK providers.
jest.mock('../components/ActivateKeeperModal', () => ({
  ActivateKeeperModal: ({ mode, keeperName, isOpen }: { mode: string; keeperName: string; isOpen: boolean }) => (
    <div data-testid={`modal-stub-${mode}`} data-open={String(isOpen)}>
      {keeperName}
    </div>
  ),
}));

describe('useActivateFlow', () => {
  // Most tests run as the typical authenticated user with the write
  // permission; only the no-permission tests override.
  beforeEach(() => {
    mockHasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports hasPermission: true when user has SecretKeepersWrite', () => {
    const { result } = renderHook(() => useActivateFlow({ name: 'aws-prod', isActive: false }));
    expect(result.current.hasPermission).toBe(true);
  });

  it('reports hasPermission: false without the write permission', () => {
    mockHasPermission.mockReturnValue(false);
    const { result } = renderHook(() => useActivateFlow({ name: 'aws-prod', isActive: false }));
    expect(result.current.hasPermission).toBe(false);
  });

  it('sets mode to "activate" when keeper is inactive', () => {
    const { result } = renderHook(() => useActivateFlow({ name: 'aws-prod', isActive: false }));
    render(result.current.modal);
    expect(screen.getByTestId('modal-stub-activate')).toBeInTheDocument();
  });

  it('sets mode to "deactivate" when keeper is active', () => {
    const { result } = renderHook(() => useActivateFlow({ name: 'aws-prod', isActive: true }));
    render(result.current.modal);
    expect(screen.getByTestId('modal-stub-deactivate')).toBeInTheDocument();
  });

  it('onClick opens the modal', async () => {
    render(<FlowConsumer name="aws-prod" isActive={false} />);
    expect(screen.getByTestId('modal-stub-activate')).toHaveAttribute('data-open', 'false');

    await userEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('modal-stub-activate')).toHaveAttribute('data-open', 'true');
  });

  it('onClick is a no-op when hasPermission is false', async () => {
    mockHasPermission.mockReturnValue(false);
    render(<FlowConsumer name="aws-prod" isActive={false} />);
    await userEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('modal-stub-activate')).toHaveAttribute('data-open', 'false');
  });
});
