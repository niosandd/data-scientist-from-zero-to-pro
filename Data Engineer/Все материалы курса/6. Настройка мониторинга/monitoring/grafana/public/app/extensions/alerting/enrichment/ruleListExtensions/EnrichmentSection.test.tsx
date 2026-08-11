import { render, screen } from 'test/test-utils';

import { mockAlertEnrichment } from '../__mocks__/enrichmentApi';

import { EnrichmentSection } from './EnrichmentSection';

describe('EnrichmentSection', () => {
  const mockEnrichments = [mockAlertEnrichment()];

  const mockProvisionedEnrichment = mockAlertEnrichment({
    metadata: {
      name: 'provisioned-enrichment',
      annotations: {
        'grafana.com/provenance': 'file',
      },
    },
    spec: {
      title: 'Provisioned Enrichment',
      description: 'Provisioned description',
      steps: [
        {
          timeout: '30s',
          type: 'enricher',
          enricher: { type: 'assign', assign: { annotations: [] } },
        },
      ],
    },
  });
  const mockProvisionedList = [mockProvisionedEnrichment];

  const defaultProps = {
    title: 'Test Section',
    subtitle: 'Test subtitle',
    enrichments: mockEnrichments,
    showActions: true,
    emptyStateMessage: 'No enrichments',
  };

  it('should render enrichments with edit icon when user has write permission', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<EnrichmentSection {...defaultProps} canWrite={true} onEdit={onEdit} onDelete={onDelete} />);

    const editButtons = screen.getAllByRole('button', { name: /edit enrichment/i });
    expect(editButtons).toHaveLength(1);

    const deleteButtons = screen.getAllByRole('button', { name: /delete enrichment/i });
    expect(deleteButtons).toHaveLength(1);
  });

  it('should render enrichments with eye icon when user lacks write permission', () => {
    const onEdit = jest.fn();

    render(<EnrichmentSection {...defaultProps} canWrite={false} onEdit={onEdit} />);

    const viewButtons = screen.getAllByRole('button', { name: /view enrichment/i });
    expect(viewButtons).toHaveLength(1);

    const deleteButtons = screen.queryAllByRole('button', { name: /delete enrichment/i });
    expect(deleteButtons).toHaveLength(0);
  });

  it('should render provisioned enrichments as read-only even with write permission', () => {
    const onEdit = jest.fn();

    render(<EnrichmentSection {...defaultProps} enrichments={mockProvisionedList} canWrite={true} onEdit={onEdit} />);

    const viewButtons = screen.getAllByRole('button', { name: /view enrichment/i });
    expect(viewButtons).toHaveLength(1);

    const deleteButtons = screen.queryAllByRole('button', { name: /delete enrichment/i });
    expect(deleteButtons).toHaveLength(0);
  });

  it('should not show action buttons when showActions is false', () => {
    render(<EnrichmentSection {...defaultProps} showActions={false} />);

    const editButtons = screen.queryAllByRole('button', { name: /edit enrichment/i });
    const viewButtons = screen.queryAllByRole('button', { name: /view enrichment/i });
    const deleteButtons = screen.queryAllByRole('button', { name: /delete enrichment/i });

    expect(editButtons).toHaveLength(0);
    expect(viewButtons).toHaveLength(0);
    expect(deleteButtons).toHaveLength(0);
  });

  it('should show empty state message when no enrichments', () => {
    render(<EnrichmentSection {...defaultProps} enrichments={[]} />);

    expect(screen.getByText('No enrichments')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();

    render(<EnrichmentSection {...defaultProps} canWrite={true} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit enrichment/i });
    editButton.click();

    expect(onEdit).toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();

    render(<EnrichmentSection {...defaultProps} canWrite={true} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete enrichment/i });
    deleteButton.click();

    expect(onDelete).toHaveBeenCalled();
  });

  it('should default canWrite to true for backward compatibility', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<EnrichmentSection {...defaultProps} onEdit={onEdit} onDelete={onDelete} />);

    const editButtons = screen.getAllByRole('button', { name: /edit enrichment/i });
    expect(editButtons).toHaveLength(1);

    const deleteButtons = screen.getAllByRole('button', { name: /delete enrichment/i });
    expect(deleteButtons).toHaveLength(1);
  });
});
