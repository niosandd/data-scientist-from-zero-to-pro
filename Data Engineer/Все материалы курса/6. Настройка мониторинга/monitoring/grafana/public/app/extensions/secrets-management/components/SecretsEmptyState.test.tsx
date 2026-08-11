import { render, screen, userEvent } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

import { SecretsEmptyState } from './SecretsEmptyState';

const handleCreateSecret = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  // Mock permissions to allow creating secrets
  contextSrv.user.permissions = {
    [AccessControlAction.SecretSecureValuesCreate]: true,
  };
});

describe('SecretsEmptyState', () => {
  it('should have a create button when user has create permission', async () => {
    render(<SecretsEmptyState onCreateSecret={handleCreateSecret} />);
    const createButton = screen.getByText(/create secure value/i);
    expect(createButton).toBeInTheDocument();
    await userEvent.click(createButton);
    expect(handleCreateSecret).toHaveBeenCalledTimes(1);
  });

  it('should not show create button when user lacks create permission', () => {
    // Override permissions to remove create permission
    contextSrv.user.permissions = {
      [AccessControlAction.SecretSecureValuesCreate]: false,
    };
    render(<SecretsEmptyState onCreateSecret={handleCreateSecret} />);
    expect(screen.queryByRole('button', { name: /create secure value/i })).not.toBeInTheDocument();
    expect(screen.getByText(/you do not have permission to create secure values/i)).toBeInTheDocument();
  });

  it('should show helpful message when user cannot create secrets', () => {
    // Override permissions to remove create permission
    contextSrv.user.permissions = {
      [AccessControlAction.SecretSecureValuesCreate]: false,
    };
    render(<SecretsEmptyState onCreateSecret={handleCreateSecret} />);
    expect(screen.getByText(/please contact your administrator to create a new secure value/i)).toBeInTheDocument();
  });
});
