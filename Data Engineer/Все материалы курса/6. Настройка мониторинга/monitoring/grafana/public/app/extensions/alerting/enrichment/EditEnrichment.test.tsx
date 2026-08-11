import { waitFor, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom-v5-compat';
import { byRole, byText } from 'testing-library-selector';

import { locationService } from '@grafana/runtime';
import { AppNotificationList } from 'app/core/components/AppNotifications/AppNotificationList';
import { K8sAnnotations } from 'app/features/alerting/unified/utils/k8s/constants';
import { isLLMPluginEnabled } from 'app/features/dashboard/components/GenAI/utils';
import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { render } from '../../../../test/test-utils';
import { alertEnrichmentAPIv1beta1 } from '../../api/clients/alertenrichment/v1beta1';
import { getAlertingEnterpriseRoutes } from '../index';

import EditEnrichment from './EditEnrichment';
import { setupEnrichmentMockServer } from './__mocks__/enrichmentApi';

jest.mock('app/features/dashboard/components/GenAI/utils');

jest.mock('app/features/alerting/unified/hooks/useAbilities', () => ({
  ...jest.requireActual('app/features/alerting/unified/hooks/useAbilities'),
  useEnrichmentAbility: () => [true, true] as const, // [supported, canWrite]
}));

const { apiConfig } = setupEnrichmentMockServer();

interface ProvisionedOverride {
  provenance?: string;
  metadata?: {
    name?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    title?: string;
    description?: string;
  };
}

function mockProvisionedEnrichment({ provenance = 'api', metadata, spec }: ProvisionedOverride = {}) {
  const annotations = {
    [K8sAnnotations.Provenance]: provenance,
    ...(metadata?.annotations ?? {}),
  };

  apiConfig.mockGetEnrichment({
    metadata: {
      name: 'test-enrichment',
      ...metadata,
      annotations,
    },
    spec: {
      title: 'Provisioned Enrichment',
      description: 'This is a provisioned enrichment',
      steps: [
        {
          timeout: '30s',
          type: 'enricher',
          enricher: { type: 'assign', assign: { annotations: [] } },
        },
      ],
      ...spec,
    },
  });
}

beforeAll(() => {
  addRootReducer({
    [alertEnrichmentAPIv1beta1.reducerPath]: alertEnrichmentAPIv1beta1.reducer,
  });
  addExtraMiddleware(alertEnrichmentAPIv1beta1.middleware);
});

const ui = {
  enrichmentNameInput: byRole('textbox', { name: /Enrichment Name/ }),
  descriptionInput: byRole('textbox', { name: /Description/ }),
  timeoutInput: byRole('textbox', { name: /Timeout/ }),
  saveButton: byRole('button', { name: 'Save' }),
  cancelButton: byRole('button', { name: 'Cancel' }),
  closeButton: byRole('button', { name: 'Close' }),
  successNotification: byRole('status', { name: 'Alert enrichment updated successfully!' }),
  errorNotification: byRole('alert', { name: 'Failed to update alert enrichment' }),
  loadingAlert: byRole('alert', { name: 'Failed to load enrichment' }),
  notFoundHeading: byText('Alert Enrichment not found'),
  explainEnricherWarning: byText(
    'Explain enricher uses LLM to generate explanations for alerts. Configure the annotation key where the explanation will be stored.'
  ),
  enricherTypeSelector: byRole('combobox', { name: /Enricher Type/ }),
};

function renderEditEnrichment(enrichmentName = 'test-enrichment') {
  // Use the actual enterprise route path to ensure tests match production
  const enterpriseRoutes = getAlertingEnterpriseRoutes();
  const editRoute = enterpriseRoutes.find((route) => route.path === '/alerting/admin/enrichment/:enrichmentK8sName');

  if (!editRoute) {
    throw new Error('Could not find EditEnrichment route in enterprise routes');
  }

  return render(
    <Routes>
      <Route
        path={editRoute.path}
        element={
          <>
            <EditEnrichment />
            <AppNotificationList />
          </>
        }
      />
    </Routes>,
    {
      renderWithRouter: true,
      historyOptions: { initialEntries: [`/alerting/admin/enrichment/${enrichmentName}`] },
    }
  );
}

describe('EditEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isLLMPluginEnabled).mockResolvedValue(true);
  });

  describe('Form Loading', () => {
    it('should populate form fields with API data after loading', async () => {
      renderEditEnrichment('test-enrichment');

      // Wait for form to render and be populated with API data
      const nameInput = await ui.enrichmentNameInput.find();

      expect(nameInput).toHaveValue('Enrichment test-enrichment');

      // Edit drawer: "More options" auto-expands when description/timeout have value
      expect(await ui.descriptionInput.find()).toHaveValue('Description for test-enrichment');
      expect(ui.timeoutInput.get()).toHaveValue('30s');

      expect(ui.saveButton.get()).toBeEnabled();
      expect(ui.cancelButton.get()).toBeEnabled();
    });

    it('should show error when enrichment does not exist', async () => {
      // Test with nonexistent enrichment name
      renderEditEnrichment('nonexistent');

      // Should show error message for 404 response
      await ui.loadingAlert.find();
      expect(ui.loadingAlert.get()).toHaveTextContent('Failed to load enrichment');
    });

    it('should handle LLM plugin disabled state', async () => {
      jest.mocked(isLLMPluginEnabled).mockResolvedValue(false);

      renderEditEnrichment();

      await ui.enrichmentNameInput.find();
      // Form should still render even when LLM is disabled
      expect(ui.enrichmentNameInput.get()).toBeInTheDocument();
    });

    it('should show explain enricher warning when explain type is selected', async () => {
      // Override the mock to return an enrichment with explain type
      apiConfig.mockGetEnrichment({
        metadata: { name: 'test-enrichment' },
        spec: {
          title: 'Enrichment test-enrichment',
          description: 'Description for test-enrichment',
          steps: [
            {
              timeout: '30s',
              type: 'enricher',
              enricher: { type: 'explain', explain: { annotation: 'explanation' } },
            },
          ],
        },
      });

      renderEditEnrichment();

      // Wait for form to load with explain enricher
      await ui.enrichmentNameInput.find();

      // Verify the explain enricher warning text is displayed
      expect(ui.explainEnricherWarning.get()).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should allow typing in form fields', async () => {
      const { user } = renderEditEnrichment();

      await ui.enrichmentNameInput.find();

      // Verify form can be interacted with (clear existing values first since form is pre-populated)
      await user.clear(ui.enrichmentNameInput.get());
      await user.type(ui.enrichmentNameInput.get(), 'Test Enrichment Name');
      expect(ui.enrichmentNameInput.get()).toHaveValue('Test Enrichment Name');

      // Edit drawer: "More options" auto-expands when description/timeout have value
      await ui.descriptionInput.find();

      await user.clear(ui.descriptionInput.get());
      await user.type(ui.descriptionInput.get(), 'Test description');
      expect(ui.descriptionInput.get()).toHaveValue('Test description');

      await user.clear(ui.timeoutInput.get());
      await user.type(ui.timeoutInput.get(), '45s');
      expect(ui.timeoutInput.get()).toHaveValue('45s');
    });
  });

  describe('Navigation', () => {
    it('should navigate to enrichments list when cancel is clicked', async () => {
      const { user } = renderEditEnrichment();

      await ui.cancelButton.find();
      await user.click(ui.cancelButton.get());

      await waitFor(() => {
        expect(locationService.getLocation().pathname).toBe('/alerting/admin/enrichment');
      });
    });
  });

  describe('Drawer', () => {
    it('renders edit drawer when opening edit page URL', async () => {
      renderEditEnrichment();
      await ui.enrichmentNameInput.find();
      // Drawer is open (form is visible)
      expect(ui.enrichmentNameInput.get()).toBeInTheDocument();
    });
  });

  describe('Provisioned Enrichments', () => {
    it('handles provisioned enrichments correctly', async () => {
      mockProvisionedEnrichment({ provenance: 'api' });
      renderEditEnrichment();

      // Wait for form to load
      await ui.enrichmentNameInput.find();

      // Should show provisioning alert notification in the UI indicating the enrichment cannot be edited through the UI
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Form fields should be disabled
      expect(ui.enrichmentNameInput.get()).toBeDisabled();
      expect(ui.enricherTypeSelector.get()).toBeDisabled();

      // Read-only: description and timeout are shown inline (no collapse) when they have value
      expect(await ui.descriptionInput.find()).toBeDisabled();
      expect(ui.timeoutInput.get()).toBeDisabled();

      // Save button should not be present; read-only drawer shows Close button
      expect(ui.saveButton.query()).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
    });

    it('allows editing non-provisioned enrichments', async () => {
      renderEditEnrichment();

      // Wait for form to load
      await ui.enrichmentNameInput.find();

      // Should not show provisioning alert
      expect(screen.queryByText(/This alert enrichment cannot be edited through the UI/)).not.toBeInTheDocument();
      expect(screen.queryByText(/This alert enrichment has been provisioned/)).not.toBeInTheDocument();

      // Form should be editable
      expect(ui.enrichmentNameInput.get()).not.toBeDisabled();
      expect(ui.saveButton.get()).toBeInTheDocument();
    });
  });
});
