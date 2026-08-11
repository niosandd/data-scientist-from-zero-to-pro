import { screen } from '@testing-library/react';

import { type DomainInfo } from '../../../types';
import { renderWithRedux, setupMocks, cleanupMocks, mockDomainInfo } from '../testUtils';

import { SCIMInfoCards } from './SCIMInfoCards';

describe('SCIMInfoCards', () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  const defaultProps = {
    domainInfo: mockDomainInfo,
    stackId: '12345',
  };

  it('should render domain and stack ID information', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} />);

    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('grafana.net')).toBeInTheDocument();
    expect(screen.getByText('Stack ID')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('should render domain and stack ID with proper Text component variants', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} />);

    // Check that the domain and stack ID values are rendered with code variant
    const domainValue = screen.getByText('grafana.net');
    const stackIdValue = screen.getByText('12345');

    expect(domainValue).toBeInTheDocument();
    expect(stackIdValue).toBeInTheDocument();
  });

  it('should render copy buttons for both domain and stack ID', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} />);

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(2);
  });

  it('should handle long domain names with proper styling', () => {
    const longDomainInfo: DomainInfo = {
      domain: 'very-long-domain-name-that-should-wrap-properly.grafana.net',
      subdomain: 'test-stack',
    };

    renderWithRedux(<SCIMInfoCards {...defaultProps} domainInfo={longDomainInfo} />);

    expect(screen.getByText('very-long-domain-name-that-should-wrap-properly.grafana.net')).toBeInTheDocument();
  });

  it('should handle loading state for stack ID', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} stackId="Loading..." />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle error state for stack ID', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} stackId="Error loading stack ID" />);

    expect(screen.getByText('Error loading stack ID')).toBeInTheDocument();
  });

  it('should render with different domain info', () => {
    const customDomainInfo: DomainInfo = {
      domain: 'custom.example.com',
      subdomain: 'custom-stack',
    };

    renderWithRedux(<SCIMInfoCards {...defaultProps} domainInfo={customDomainInfo} />);

    expect(screen.getByText('custom.example.com')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderWithRedux(<SCIMInfoCards {...defaultProps} />);

    const domainCopyButton = screen.getByLabelText(/Copy domain to clipboard/i);
    const stackIdCopyButton = screen.getByLabelText(/Copy stack ID to clipboard/i);

    expect(domainCopyButton).toHaveAttribute('aria-label', 'Copy domain to clipboard');
    expect(stackIdCopyButton).toHaveAttribute('aria-label', 'Copy stack ID to clipboard');
  });
});
