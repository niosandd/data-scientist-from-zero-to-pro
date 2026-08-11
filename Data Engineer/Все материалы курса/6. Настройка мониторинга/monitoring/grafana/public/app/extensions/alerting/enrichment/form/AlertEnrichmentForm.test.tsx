import { render, screen } from 'test/test-utils';
import { byRole } from 'testing-library-selector';

import type { FeatureToggles } from '@grafana/data';
import { config, getDataSourceSrv } from '@grafana/runtime';
import { mockBoundingClientRect } from '@grafana/test-utils';
import { mockDataSource } from 'app/features/alerting/unified/mocks';
import { PROMETHEUS_DATASOURCE_UID } from 'app/features/alerting/unified/mocks/server/constants';
import { setupDataSources } from 'app/features/alerting/unified/testSetup/datasources';

import { AlertEnrichmentForm } from './AlertEnrichmentForm';
import { type AlertEnrichmentFormData } from './form';

// Setup default datasource for tests
const dataSources = {
  prometheus: mockDataSource(
    {
      type: 'prometheus',
      name: 'Prometheus',
      uid: PROMETHEUS_DATASOURCE_UID,
      isDefault: true,
    },
    { alerting: true, module: 'core:plugin/prometheus' }
  ),
};

beforeAll(() => {
  mockBoundingClientRect({ width: 240, height: 640 });

  // Setup datasources
  setupDataSources(dataSources.prometheus);

  const srv = getDataSourceSrv() as { get: (key?: string | null) => Promise<unknown> };
  srv.get = jest.fn().mockResolvedValue({});
});

// Mock the Prometheus QueryEditor component that gets loaded by QueryEditorRow
jest.mock('@grafana/prometheus', () => ({
  QueryEditor: ({ query, onChange, onRunQuery }: any) => (
    <div data-testid="prometheus-query-editor">
      <input
        data-testid="query-expr-input"
        value={query?.expr || ''}
        onChange={(e) => onChange && onChange({ ...query, expr: e.target.value })}
        placeholder="Enter Prometheus query"
      />
      <button data-testid="run-query" onClick={() => onRunQuery && onRunQuery()}>
        Run Query
      </button>
    </div>
  ),
}));

const ui = {
  // Basic form fields - now using proper accessible names
  enrichmentNameInput: byRole('textbox', { name: /Enrichment Name/ }),
  descriptionInput: byRole('textbox', { name: /Description/ }),
  timeoutInput: byRole('textbox', { name: /Timeout/ }),
  enricherTypeSelector: byRole('combobox', { name: /Enricher Type/ }),

  // Action buttons
  saveButton: byRole('button', { name: 'Save Enrichment' }),
  cancelButton: byRole('button', { name: 'Cancel' }),

  // Scope section
  scope: {
    globalScopedRadio: byRole('radio', { name: /Global scoped/i }),
    labelScopedRadio: byRole('radio', { name: /Label scoped/ }),
    annotationScopedRadio: byRole('radio', { name: /Annotation scoped/ }),
    addMatcherButton: byRole('button', { name: 'Add' }),
  },

  // Assign enricher configuration
  assignConfig: {
    addAnnotationButton: byRole('button', { name: /Add (another )?annotation assignment/ }),
    annotationKeyInputs: byRole('textbox', { name: /Key/ }),
    annotationValueInputs: byRole('textbox', { name: /Value/ }),
    removeAnnotationButtons: byRole('button', { name: /Remove annotation/ }),
  },

  externalConfig: {
    urlInput: byRole('textbox', { name: /External Service URL/ }),
  },

  // Matcher fields (when scope is not global) - using placeholder text to avoid conflicts
  matchers: {
    nameInput: () => screen.getByPlaceholderText('Name'),
    typeSelector: () => screen.getByDisplayValue('Equals (=)'),
    valueInput: () => screen.getByPlaceholderText('Value'),
    removeButton: byRole('button', { name: /Remove matcher/ }),
  },
};

describe('AlertEnrichmentForm', () => {
  const mockOnSubmit = jest.fn<void, [AlertEnrichmentFormData]>();
  const mockOnCancel = jest.fn<void, []>();

  // Default props for most tests
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    llmEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.featureToggles = {} as FeatureToggles;
  });

  it('should render basic form fields', () => {
    render(<AlertEnrichmentForm {...defaultProps} />);

    // Check basic form fields using ui object
    expect(ui.enrichmentNameInput.get()).toBeInTheDocument();
    expect(ui.descriptionInput.get()).toBeInTheDocument();
    expect(ui.timeoutInput.get()).toBeInTheDocument();
    expect(ui.enricherTypeSelector.get()).toHaveValue('Assign');

    // Check action buttons
    expect(ui.saveButton.get()).toBeInTheDocument();
    expect(ui.cancelButton.get()).toBeInTheDocument();

    // Check scope section
    expect(ui.scope.globalScopedRadio.get()).toBeChecked();
  });

  it('should handle cancel button click', async () => {
    const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

    await user.click(ui.cancelButton.get());

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  describe('Assign Enricher Configuration', () => {
    it('should show assign enricher configuration by default', async () => {
      render(<AlertEnrichmentForm {...defaultProps} />);

      const typeSelector = await ui.enricherTypeSelector.find();
      // Default enricher type should be 'assign'
      expect(typeSelector).toHaveValue('Assign');
      expect(ui.assignConfig.addAnnotationButton.get()).toBeInTheDocument();
    });

    it('should allow adding annotation assignments', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // First annotation row is already present; fill it in
      await user.type(ui.assignConfig.annotationKeyInputs.getAll()[0], 'severity');
      await user.type(ui.assignConfig.annotationValueInputs.getAll()[0], 'critical');

      // Add second annotation assignment
      await user.click(ui.assignConfig.addAnnotationButton.get());

      // Fill in the second annotation
      await user.type(ui.assignConfig.annotationKeyInputs.getAll()[1], 'team');
      await user.type(ui.assignConfig.annotationValueInputs.getAll()[1], 'backend');

      const annotationKeys = ui.assignConfig.annotationKeyInputs.getAll();
      const annotationValues = ui.assignConfig.annotationValueInputs.getAll();
      // Verify the values were entered correctly
      expect(annotationKeys[0]).toHaveValue('severity');
      expect(annotationValues[0]).toHaveValue('critical');
      expect(annotationKeys[1]).toHaveValue('team');
      expect(annotationValues[1]).toHaveValue('backend');

      // Should have two remove buttons
      expect(ui.assignConfig.removeAnnotationButtons.getAll()).toHaveLength(2);
    });

    it('should allow removing annotation assignments', async () => {
      const editPayload: AlertEnrichmentFormData = {
        scope: 'global',
        title: 'Test Enrichment',
        description: 'Test description',
        steps: [
          {
            timeout: '30s',
            type: 'enricher',
            enricher: {
              type: 'assign',
              assign: {
                annotations: [
                  { name: 'severity', value: 'critical' },
                  { name: 'team', value: 'backend' },
                ],
              },
            },
          },
        ],
      };

      const { user } = render(<AlertEnrichmentForm {...defaultProps} editPayload={editPayload} />);

      // Should start with 2 annotation assignments
      const initialKeys = ui.assignConfig.annotationKeyInputs.getAll();
      const initialValues = ui.assignConfig.annotationValueInputs.getAll();
      const initialRemoveButtons = ui.assignConfig.removeAnnotationButtons.getAll();

      expect(initialKeys).toHaveLength(2);
      expect(initialValues).toHaveLength(2);
      expect(initialRemoveButtons).toHaveLength(2);

      // Verify the initial values are populated
      expect(initialKeys[0]).toHaveValue('severity');
      expect(initialValues[0]).toHaveValue('critical');
      expect(initialKeys[1]).toHaveValue('team');
      expect(initialValues[1]).toHaveValue('backend');

      // Remove the first annotation
      await user.click(initialRemoveButtons[0]);

      // Should now have only 1 annotation assignment left
      const afterFirstRemoval = ui.assignConfig.annotationKeyInputs.getAll();
      const afterFirstRemovalValues = ui.assignConfig.annotationValueInputs.getAll();
      const afterFirstRemovalButtons = ui.assignConfig.removeAnnotationButtons.getAll();

      expect(afterFirstRemoval).toHaveLength(1);
      expect(afterFirstRemovalValues).toHaveLength(1);
      expect(afterFirstRemovalButtons).toHaveLength(1);

      // The remaining annotation should be the second one (team/backend)
      expect(afterFirstRemoval[0]).toHaveValue('team');
      expect(afterFirstRemovalValues[0]).toHaveValue('backend');

      // Remove the second annotation
      await user.click(afterFirstRemovalButtons[0]);

      // Should now have no annotation assignments
      expect(ui.assignConfig.annotationKeyInputs.queryAll()).toHaveLength(0);
      expect(ui.assignConfig.annotationValueInputs.queryAll()).toHaveLength(0);
      expect(ui.assignConfig.removeAnnotationButtons.queryAll()).toHaveLength(0);
    });
  });

  describe('External Enricher Configuration', () => {
    it('should allow user to input URL for external enricher', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Change to external enricher type
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /External/ }));

      // Should show external enricher configuration with correct placeholder
      const urlInput = await ui.externalConfig.urlInput.find();
      expect(urlInput).toHaveProperty('placeholder', 'https://api.example.com/enrich');

      // User should be able to type a URL into the input
      const testUrl = 'https://my-enricher-service.com/api/enrich';
      await user.type(urlInput, testUrl);

      // Verify the URL was entered correctly
      expect(urlInput).toHaveValue(testUrl);

      // Fill in basic form data to test form submission
      await user.type(ui.enrichmentNameInput.get(), 'External Test Enrichment');
      await user.type(ui.descriptionInput.get(), 'Test external enricher');

      // Submit the form
      await user.click(ui.saveButton.get());

      // Verify the form was submitted with the correct external enricher configuration
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const [submittedFormData] = mockOnSubmit.mock.calls[0];

      expect(submittedFormData.title).toBe('External Test Enrichment');
      expect(submittedFormData.description).toBe('Test external enricher');

      // Type-safe check for external enricher configuration
      const step = submittedFormData.steps?.[0];
      const enricher = step?.enricher;
      if (enricher?.type === 'external' && enricher.external) {
        expect(enricher.external.url).toBe(testUrl);
      } else {
        fail('Expected external enricher configuration');
      }
    });
  });

  describe('Explain Enricher Configuration', () => {
    it('should show explain enricher UI when type is changed', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Explain/ }));

      // Should show explain enricher configuration
      expect(screen.getByPlaceholderText('explanation')).toBeInTheDocument();
      expect(screen.getByText(/Explain enricher uses LLM/)).toBeInTheDocument();
    });

    it('should show LLM disabled warning when llmEnabled is false and explain type is selected', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} llmEnabled={false} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Explain/ }));

      // Should show LLM disabled warning
      expect(screen.getByText('LLM is disabled')).toBeInTheDocument();
      expect(screen.getByText('Explain enricher requires Grafana LLM plugin to be enabled')).toBeInTheDocument();
    });

    it('should not show LLM disabled warning when llmEnabled is true and explain type is selected', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} llmEnabled={true} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Explain/ }));

      // Should not show LLM disabled warning
      expect(screen.queryByText('LLM is disabled')).not.toBeInTheDocument();
      expect(screen.queryByText('Explain enricher requires Grafana LLM plugin to be enabled')).not.toBeInTheDocument();
    });
  });

  describe('Data Source Query Enricher Configuration', () => {
    it('should show dsquery enricher UI when type is changed', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // First verify we can see the enricher type selector
      expect(ui.enricherTypeSelector.get()).toHaveValue('Assign');

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Data Source Query/ }));

      // Verify the type has changed
      expect(ui.enricherTypeSelector.get()).toHaveValue('Data Source Query');

      // Should show query enricher configuration with one query already present (Phase 1 Step 3: auto-show query editor)
      expect(
        screen.getByText(
          'Define queries that will be executed to enrich your alerts. The results will be available in the enrichment context.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add query' })).toBeInTheDocument();

      // Should no longer show the assign enricher UI
      expect(screen.queryByRole('button', { name: /Add (another )?annotation assignment/ })).not.toBeInTheDocument();
    });

    it('should submit datasource enricher with correct raw query payload structure', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Fill in basic form data
      await user.type(ui.enrichmentNameInput.get(), 'Test Datasource Enrichment');
      await user.type(ui.descriptionInput.get(), 'Test description');
      await user.clear(ui.timeoutInput.get());
      await user.type(ui.timeoutInput.get(), '45s');

      // Change to datasource enricher type
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Data Source Query/ }));

      // Submit the form (dsquery now defaults to one query - Phase 1 Step 3)
      await user.click(ui.saveButton.get());

      // Verify the onSubmit was called with correct structure for dsquery
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      // With proper typing, we can assert the exact structure
      const [submittedFormData] = mockOnSubmit.mock.calls[0];
      expect(submittedFormData.title).toBe('Test Datasource Enrichment');
      expect(submittedFormData.description).toBe('Test description');
      expect(submittedFormData.steps).toHaveLength(1);
      expect(submittedFormData.steps[0].timeout).toBe('45s');
      expect(submittedFormData.steps[0].type).toBe('enricher');

      // Verify the specific structure matches the expected payload format (one default query)
      const submittedData: AlertEnrichmentFormData = mockOnSubmit.mock.calls[0][0];
      const enricherConfig = submittedData.steps[0].enricher;

      // TypeScript now knows the exact structure, so we can safely access nested properties
      if (enricherConfig?.type === 'dsquery' && enricherConfig.dataSource) {
        expect(enricherConfig.dataSource.type).toBe('raw');
        const queries = enricherConfig.dataSource.raw?.request?.queries ?? [];
        expect(queries).toHaveLength(1);
        expect(queries[0].refId).toBe('A');
        expect(queries[0]).toMatchObject({ refId: 'A' });
        expect(enricherConfig.dataSource.raw?.refId).toBe('A');
      } else {
        fail('Expected dsquery enricher with dataSource configuration');
      }
    });
  });

  describe('RCA Workbench Enricher Configuration', () => {
    it('should show RCA Workbench enricher UI when type is changed', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /RCA Workbench/ }));

      // Should show RCA Workbench description (text is exactly as rendered)
      expect(
        screen.getByText(
          'RCA Workbench enricher does not require any configuration. It will start enriching alerts as soon as it is enabled.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Sift Enricher Configuration', () => {
    it('should show sift enricher UI when type is changed', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Sift/ }));

      // Should show sift description (text is exactly as rendered)
      expect(
        screen.getByText(
          'Sift enricher does not require any configuration. It will start enriching alerts as soon as it is enabled.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Assistant Investigations Enricher Configuration', () => {
    it('should not show Assistant Investigations option when feature toggle is disabled', async () => {
      config.featureToggles.alertingEnrichmentAssistantInvestigations = false;
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());

      // Should not have Assistant Investigations option
      expect(screen.queryByRole('option', { name: /Assistant Investigations/ })).not.toBeInTheDocument();
    });

    it('should not show Assistant Investigations option when feature toggle is undefined', async () => {
      // Feature toggle not set
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());

      // Should not have Assistant Investigations option
      expect(screen.queryByRole('option', { name: /Assistant Investigations/ })).not.toBeInTheDocument();
    });

    it('should show Assistant Investigations option when feature toggle is enabled', async () => {
      config.featureToggles.alertingEnrichmentAssistantInvestigations = true;
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());

      // Should have Assistant Investigations option
      expect(screen.getByRole('option', { name: /Assistant Investigations/ })).toBeInTheDocument();
    });

    it('should show assistant investigations enricher UI when type is changed and feature toggle is enabled', async () => {
      config.featureToggles.alertingEnrichmentAssistantInvestigations = true;
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Focus the combobox and open it
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Assistant Investigations/ }));

      // Should show generic enricher description (text is exactly as rendered)
      expect(
        screen.getByText(
          'Assistant Investigations enricher does not require any configuration. It will start enriching alerts as soon as it is enabled.'
        )
      ).toBeInTheDocument();
    });

    it('should submit form with assistant enricher type when Assistant Investigations is selected', async () => {
      config.featureToggles.alertingEnrichmentAssistantInvestigations = true;
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Fill in basic form data
      await user.type(ui.enrichmentNameInput.get(), 'Test Assistant Investigations');
      await user.type(ui.descriptionInput.get(), 'Test description');

      // Change to Assistant Investigations enricher type
      await user.click(ui.enricherTypeSelector.get());
      await user.click(await screen.findByRole('option', { name: /Assistant Investigations/ }));

      // Submit the form
      await user.click(ui.saveButton.get());

      // Verify the form was submitted with the correct assistant enricher configuration
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const [submittedFormData] = mockOnSubmit.mock.calls[0];

      expect(submittedFormData.title).toBe('Test Assistant Investigations');
      expect(submittedFormData.description).toBe('Test description');

      // Verify the enricher type is 'assistant'
      const step = submittedFormData.steps?.[0];
      const enricher = step?.enricher;
      expect(enricher?.type).toBe('assistant');

      // Verify it has the assistant configuration
      if (enricher?.type === 'assistant' && enricher.assistant) {
        // assistant enricher should have an empty configuration object
        expect(enricher.assistant).toEqual({});
      } else {
        fail('Expected assistant enricher configuration');
      }
    });
  });

  describe('Scope Configuration', () => {
    it('should have global scope selected by default', () => {
      render(<AlertEnrichmentForm {...defaultProps} />);

      // Global scope should be selected by default
      expect(ui.scope.globalScopedRadio.get()).toBeChecked();
    });

    it('should allow changing to label scope', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Click on label scoped radio
      await user.click(ui.scope.labelScopedRadio.get());

      expect(ui.scope.labelScopedRadio.get()).toBeChecked();

      // Should show "Add" button for matchers
      expect(ui.scope.addMatcherButton.get()).toBeInTheDocument();
    });

    it('should allow changing to annotation scope', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Click on annotation scoped radio
      await user.click(ui.scope.annotationScopedRadio.get());

      expect(ui.scope.annotationScopedRadio.get()).toBeChecked();

      // Should show "Add" button for matchers
      expect(ui.scope.addMatcherButton.get()).toBeInTheDocument();
    });

    it('should allow adding and removing matchers', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      // Change to label scope
      await user.click(ui.scope.labelScopedRadio.get());

      // Add a matcher
      await user.click(ui.scope.addMatcherButton.get());

      // Should have matcher input fields
      expect(ui.matchers.nameInput()).toBeInTheDocument();
      expect(ui.matchers.valueInput()).toBeInTheDocument();

      // Should have remove button
      expect(ui.matchers.removeButton.get()).toBeInTheDocument();

      // Remove the matcher
      await user.click(ui.matchers.removeButton.get());

      // Should not have matcher inputs anymore
      expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Value')).not.toBeInTheDocument();
    });

    it('should submit proper matcher type after changing it', async () => {
      const { user } = render(<AlertEnrichmentForm {...defaultProps} />);

      await user.type(ui.enrichmentNameInput.get(), 'Test');
      await user.click(ui.scope.labelScopedRadio.get());
      await user.click(ui.scope.addMatcherButton.get());

      // Change matcher type
      const typeCombobox = screen.getByPlaceholderText('Type');
      await user.click(typeCombobox);
      await user.click(screen.getByRole('option', { name: /Regex Match/ }));

      await user.click(ui.saveButton.get());

      const [submittedFormData] = mockOnSubmit.mock.calls[0];
      expect(submittedFormData.labelMatchers?.[0].type).toBe('=~');
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with edit payload', () => {
      const editPayload: AlertEnrichmentFormData = {
        scope: 'label',
        title: 'Existing Enrichment',
        description: 'Existing description',
        steps: [
          {
            timeout: '45s',
            type: 'enricher',
            enricher: {
              type: 'external',
              external: {
                url: 'https://existing.example.com',
              },
            },
          },
        ],
        labelMatchers: [
          {
            name: 'environment',
            type: '=',
            value: 'production',
          },
        ],
      };

      render(<AlertEnrichmentForm {...defaultProps} editPayload={editPayload} />);

      // Check that form is populated with existing values
      expect(ui.enrichmentNameInput.get()).toHaveValue('Existing Enrichment');
      expect(ui.descriptionInput.get()).toHaveValue('Existing description');
      expect(ui.timeoutInput.get()).toHaveValue('45s');
      expect(screen.getByDisplayValue('https://existing.example.com')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      render(<AlertEnrichmentForm {...defaultProps} isLoading={true} />);

      expect(ui.saveButton.get()).toBeDisabled();
      expect(ui.cancelButton.get()).toBeDisabled();
    });
  });
});
