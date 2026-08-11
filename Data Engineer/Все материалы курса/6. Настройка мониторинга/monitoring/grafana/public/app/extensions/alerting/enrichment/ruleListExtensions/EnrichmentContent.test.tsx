import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from 'test/test-utils';

import { grantPermissionsHelper } from 'app/features/alerting/unified/test/test-utils';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';
import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';
import { AccessControlAction } from 'app/types/accessControl';

import { generatedAPI } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import { setupEnrichmentMockServer, mockAlertEnrichmentList } from '../__mocks__/enrichmentApi';

import { EnrichmentContent } from './EnrichmentContent';

jest.mock('app/features/dashboard/components/GenAI/utils');
jest.mock('app/features/alerting/unified/utils/misc', () => ({
  ...jest.requireActual('app/features/alerting/unified/utils/misc'),
  isAdmin: jest.fn().mockReturnValue(false),
}));

setupEnrichmentMockServer();

beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
});

describe('EnrichmentContent', () => {
  const mockEnrichments = mockAlertEnrichmentList();

  const defaultProps = {
    ruleLevelEnrichments: mockEnrichments.items ?? [],
    globalEnrichments: [],
    ruleUid: 'test-rule-uid',
    filterLayout: 'compact' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isLLMPluginEnabled).mockResolvedValue(false);
  });

  it('should show "New alert enrichment" button when user has write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('New alert enrichment')).toBeInTheDocument();
    });
  });

  it('should hide "New alert enrichment" button when user lacks write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsRead]);

    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('New alert enrichment')).not.toBeInTheDocument();
    });
  });

  it('should show edit icon for enrichments when user has write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

    render(<EnrichmentContent {...defaultProps} />);

    await expect(screen.findByRole('button', { name: /edit enrichment/i })).resolves.toBeInTheDocument();
  });

  it('should show eye icon for enrichments when user lacks write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsRead]);

    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rule Enrichments')).toBeInTheDocument();
    });
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    const viewEnrichmentButton = viewButtons.find(
      (el) => el.getAttribute('aria-label') === 'View enrichment' || el.textContent?.trim() === 'View'
    );
    expect(viewEnrichmentButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit enrichment/i })).not.toBeInTheDocument();
  });

  it('should render form as read-only when user lacks write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsRead]);

    const user = userEvent.setup();
    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Rule Enrichments')).toBeInTheDocument();
    });
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    const viewButton = viewButtons.find(
      (el) => el.getAttribute('aria-label') === 'View enrichment' || el.textContent?.trim() === 'View'
    );
    if (!viewButton) {
      throw new Error('View enrichment button not found');
    }
    await user.click(viewButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /view enrichment|test enrichment/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /close/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('should render form as editable when user has write permission', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

    const user = userEvent.setup();
    render(<EnrichmentContent {...defaultProps} />);

    // Wait for the component to be fully loaded
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit enrichment/i })).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit enrichment/i });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit enrichment/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should show search bar and filter enrichments by name', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

    const user = userEvent.setup();
    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('enrichment-search-input')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/search by enrichment name/i)).toBeInTheDocument();
    // Default mock list has "Test Enrichment" in the rule enrichments
    expect(screen.getByText('Test Enrichment')).toBeInTheDocument();

    await user.type(screen.getByTestId('enrichment-search-input'), 'nonexistent');
    await waitFor(() => {
      expect(screen.queryByText('Test Enrichment')).not.toBeInTheDocument();
    });

    await user.clear(screen.getByTestId('enrichment-search-input'));
    await waitFor(() => {
      expect(screen.getByText('Test Enrichment')).toBeInTheDocument();
    });
  });

  it('should show edit drawer with form and enricher type dropdown when clicking edit icon', async () => {
    grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

    const user = userEvent.setup();
    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit enrichment/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit enrichment/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit enrichment/i })).toBeInTheDocument();
    });

    // Edit drawer: single step with form (no "select enricher type" step 1)
    expect(screen.getByRole('combobox', { name: /enricher type/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-enrichment')).toBeInTheDocument();
    expect(screen.queryByText(/choose an enrichment type to get started/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should show both read and write features for admin users', async () => {
    const misc = require('app/features/alerting/unified/utils/misc');
    (misc.isAdmin as jest.Mock).mockReturnValue(true);
    grantPermissionsHelper([]);

    render(<EnrichmentContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('New alert enrichment')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /edit enrichment/i })).toBeInTheDocument();
  });

  describe('Create enrichment drawer', () => {
    it('should open create drawer and show enricher type cards when clicking New alert enrichment', async () => {
      grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

      const user = userEvent.setup();
      render(<EnrichmentContent {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New alert enrichment')).toBeInTheDocument();
      });

      await user.click(screen.getByText('New alert enrichment'));

      await waitFor(() => {
        expect(screen.getByText('Create enrichment')).toBeInTheDocument();
      });
      expect(screen.getByText(/Choose an enrichment type to get started/i)).toBeInTheDocument();
      expect(screen.getByTestId('enrichment-type-assign')).toBeInTheDocument();
      expect(screen.getByTestId('enrichment-type-dsquery')).toBeInTheDocument();
    });

    it('should show configure form when an enricher type card is selected', async () => {
      grantPermissionsHelper([AccessControlAction.AlertingEnrichmentsWrite]);

      const user = userEvent.setup();
      render(<EnrichmentContent {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('New alert enrichment')).toBeInTheDocument();
      });

      await user.click(screen.getByText('New alert enrichment'));

      await waitFor(() => {
        expect(screen.getByTestId('enrichment-type-assign')).toBeInTheDocument();
      });

      // Card.Heading renders the click handler as a button; click that to advance to step 2
      const assignButton = screen.getByRole('button', { name: 'Assign' });
      await user.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText('New Assign enrichment')).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText('my-enrichment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument();
    });
  });
});
