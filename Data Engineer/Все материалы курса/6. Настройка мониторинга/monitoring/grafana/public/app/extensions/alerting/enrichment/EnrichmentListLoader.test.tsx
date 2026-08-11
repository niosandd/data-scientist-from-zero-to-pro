import { render, screen, waitFor, within } from 'test/test-utils';

import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { generatedAPI } from '../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import EnrichmentListLoader from './EnrichmentListLoader';
import { setupEnrichmentMockServer } from './__mocks__/enrichmentApi';

// Set up MSW server for mocking API calls
setupEnrichmentMockServer();

// Add the RTK Query reducer and middleware to the store
beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
});

describe('EnrichmentListLoader', () => {
  it('should display enrichment titles and descriptions with proper data isolation', async () => {
    render(<EnrichmentListLoader />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('CPU Alert Enrichment')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');

    // Should have 3 rows: 1 header + 2 data rows
    expect(rows).toHaveLength(3);

    // Test first data row (CPU Alert Enrichment) - titles and descriptions
    const cpuRow = rows[1];
    expect(within(cpuRow).getByText('CPU Alert Enrichment')).toBeInTheDocument();
    expect(within(cpuRow).getByText('Enriches CPU alerts with additional context')).toBeInTheDocument();
    expect(within(cpuRow).getByText('Assign')).toBeInTheDocument();
    expect(within(cpuRow).getByText('Labels')).toBeInTheDocument();

    // Ensure CPU row does NOT contain Memory enrichment data
    expect(within(cpuRow).queryByText('Memory Alert Enrichment')).not.toBeInTheDocument();
    expect(within(cpuRow).queryByText('Enriches memory alerts with troubleshooting steps')).not.toBeInTheDocument();
    expect(within(cpuRow).queryByText('External')).not.toBeInTheDocument();

    // Test second data row (Memory Alert Enrichment) - titles and descriptions
    const memoryRow = rows[2];
    expect(within(memoryRow).getByText('Memory Alert Enrichment')).toBeInTheDocument();
    expect(within(memoryRow).getByText('Enriches memory alerts with troubleshooting steps')).toBeInTheDocument();
    expect(within(memoryRow).getByText('External')).toBeInTheDocument();
    expect(within(memoryRow).getByText('Labels')).toBeInTheDocument();

    // Ensure Memory row does NOT contain CPU enrichment data
    expect(within(memoryRow).queryByText('CPU Alert Enrichment')).not.toBeInTheDocument();
    expect(within(memoryRow).queryByText('Enriches CPU alerts with additional context')).not.toBeInTheDocument();
    expect(within(memoryRow).queryByText('Assign')).not.toBeInTheDocument();
  });

  it('should have accessible action buttons that open edit drawer', async () => {
    render(<EnrichmentListLoader />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('CPU Alert Enrichment')).toBeInTheDocument();
    });

    // Check that we have a proper table structure
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Check column headers are accessible
    expect(screen.getByRole('columnheader', { name: 'Enrichment' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

    // Edit/View are buttons that open the edit drawer (no navigation href)
    const cpuEnrichmentEdit = screen.getByRole('button', { name: 'Edit enrichment CPU Alert Enrichment' });
    const memoryEnrichmentEdit = screen.getByRole('button', { name: 'Edit enrichment Memory Alert Enrichment' });

    expect(cpuEnrichmentEdit).toBeInTheDocument();
    expect(memoryEnrichmentEdit).toBeInTheDocument();

    // Test delete buttons are accessible by their role and accessible name
    expect(screen.getByRole('button', { name: 'Delete enrichment CPU Alert Enrichment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete enrichment Memory Alert Enrichment' })).toBeInTheDocument();
  });

  it('should display "New alert enrichment" button', async () => {
    render(<EnrichmentListLoader />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('CPU Alert Enrichment')).toBeInTheDocument();
    });

    // Check that the "New alert enrichment" button is present (opens create drawer)
    const newButton = screen.getByRole('button', { name: 'New alert enrichment' });
    expect(newButton).toBeInTheDocument();
  });
});
