import { screen } from '@testing-library/react';

import { renderWithRedux, setupMocks, cleanupMocks } from '../testUtils';

import { SCIMSetupGuide } from './SCIMSetupGuide';

describe('SCIMSetupGuide', () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  const defaultProps = {
    tenantUrl: 'https://test.grafana.net/apis/scim.grafana.app/v0alpha1/namespaces/stacks-12345',
  };

  it('should render tenant URL field with correct label', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('Tenant URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue(defaultProps.tenantUrl)).toBeInTheDocument();
  });

  it('should render tenant URL description', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText(/The tenant URL for your Identity Provider configuration/i)).toBeInTheDocument();
  });

  it('should render copy button for tenant URL', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });

  it('should render service account token section', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText(/How to create a service account & token for SCIM/i)).toBeInTheDocument();
  });

  it('should render service account token description', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText(/This service account token will be used by your Identity Provider/i)).toBeInTheDocument();
  });

  it('should render step 1: Create Service Account', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('1. Create Service Account')).toBeInTheDocument();
    expect(screen.getByText(/Go to/i)).toBeInTheDocument();
    expect(screen.getByText(/Service accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Click "Add service account"/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a service account with Role: "None"/i)).toBeInTheDocument();
  });

  it('should render step 2: Add Permissions', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('2. Add Permissions')).toBeInTheDocument();
    expect(screen.getByText(/In the service account Permissions tab/i)).toBeInTheDocument();
    expect(screen.getByText(/Allow the service account to sync users/i)).toBeInTheDocument();
    expect(screen.getByText(/Allow the service account to sync groups/i)).toBeInTheDocument();
  });

  it('should render user sync permissions', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('org.users:read')).toBeInTheDocument();
    expect(screen.getByText('org.users:write')).toBeInTheDocument();
    expect(screen.getByText('org.users:add')).toBeInTheDocument();
    expect(screen.getByText('org.users:remove')).toBeInTheDocument();
  });

  it('should render group sync permissions', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('teams:read')).toBeInTheDocument();
    expect(screen.getByText('teams:create')).toBeInTheDocument();
    expect(screen.getByText('teams:write')).toBeInTheDocument();
    expect(screen.getByText('teams:delete')).toBeInTheDocument();
  });

  it('should render step 3: Generate Token', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    expect(screen.getByText('3. Generate Token')).toBeInTheDocument();
    expect(screen.getByText(/Click "Add token"/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy the token for your Identity Provider/i)).toBeInTheDocument();
  });

  it('should render service accounts link', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    const serviceAccountsLink = screen.getByRole('link', { name: /Service accounts/i });
    expect(serviceAccountsLink).toHaveAttribute('href', '/org/serviceaccounts/create');
  });

  it('should handle different tenant URLs', () => {
    const customTenantUrl = 'https://custom.grafana.net/apis/scim.grafana.app/v0alpha1/namespaces/stacks-67890';

    renderWithRedux(<SCIMSetupGuide tenantUrl={customTenantUrl} />);

    expect(screen.getByDisplayValue(customTenantUrl)).toBeInTheDocument();
  });

  it('should handle loading state for tenant URL', () => {
    renderWithRedux(<SCIMSetupGuide tenantUrl="Loading..." />);

    expect(screen.getByDisplayValue('Loading...')).toBeInTheDocument();
  });

  it('should handle error state for tenant URL', () => {
    renderWithRedux(<SCIMSetupGuide tenantUrl="Failed to load tenant URL" />);

    expect(screen.getByDisplayValue('Failed to load tenant URL')).toBeInTheDocument();
  });

  it('should have readonly input for tenant URL', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    const tenantUrlInput = screen.getByDisplayValue(defaultProps.tenantUrl);
    expect(tenantUrlInput).toHaveAttribute('readonly');
  });

  it('should render with proper styling for code blocks', () => {
    renderWithRedux(<SCIMSetupGuide {...defaultProps} />);

    const permissionLists = screen.getAllByRole('list');
    expect(permissionLists.length).toBeGreaterThanOrEqual(2);
  });
});
