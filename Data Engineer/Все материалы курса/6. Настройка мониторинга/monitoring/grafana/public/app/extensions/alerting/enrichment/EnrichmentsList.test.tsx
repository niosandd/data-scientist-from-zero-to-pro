import { render, screen } from 'test/test-utils';
import { byRole, byText } from 'testing-library-selector';

import { K8sAnnotations } from 'app/features/alerting/unified/utils/k8s/constants';

import {
  type AlertEnrichment,
  type AlertEnrichmentSpec,
} from '../../api/clients/alertenrichment/v1beta1/endpoints.gen';

import { EnrichmentList } from './EnrichmentsList';

const ui = {
  provisionedBadge: byText('Provisioned'),
  deleteButton: byRole('button', { name: /Delete enrichment/ }),
  noEnrichmentsText: byText('No alert enrichments configured'),
  loadMoreButton: byRole('link', { name: /Load more/ }),
};

const mockOnDelete = jest.fn();
const mockOnView = jest.fn();
const mockOnEdit = jest.fn();
const mockOnLoadMore = jest.fn();

type AlertEnrichmentWithSpec = AlertEnrichment & { spec: AlertEnrichmentSpec };
type AlertEnrichmentOverrides = Partial<Pick<AlertEnrichment, 'apiVersion' | 'kind'>> & {
  metadata?: AlertEnrichment['metadata'];
  spec?: Partial<AlertEnrichmentSpec>;
};

const createMockEnrichment = (overrides: AlertEnrichmentOverrides = {}): AlertEnrichmentWithSpec => {
  const defaultEnrichment: AlertEnrichmentWithSpec = {
    metadata: {
      name: 'test-enrichment',
    },
    spec: {
      title: 'Test Enrichment',
      description: 'Test description',
      steps: [
        {
          timeout: '30s',
          type: 'enricher',
          enricher: {
            type: 'assign',
            assign: {
              annotations: [],
            },
          },
        },
      ],
    },
  };

  const mergedSpec: AlertEnrichmentSpec = {
    ...defaultEnrichment.spec,
    ...overrides.spec,
    steps: overrides.spec?.steps ?? defaultEnrichment.spec.steps,
    title: overrides.spec?.title ?? defaultEnrichment.spec.title,
  };

  return {
    ...defaultEnrichment,
    ...overrides,
    metadata: {
      ...defaultEnrichment.metadata,
      ...overrides.metadata,
    },
    spec: mergedSpec,
  };
};

const defaultProps = {
  enrichments: [],
  onDelete: mockOnDelete,
  onView: mockOnView,
  onEdit: mockOnEdit,
  onLoadMore: mockOnLoadMore,
  hasMore: false,
};

describe('EnrichmentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show no enrichments message when list is empty', () => {
    render(<EnrichmentList {...defaultProps} />);

    expect(ui.noEnrichmentsText.get()).toBeInTheDocument();
  });

  it('should show no matching enrichments when list is empty and filters are active', () => {
    render(<EnrichmentList {...defaultProps} hasActiveFilters={true} />);

    expect(screen.getByText('No matching enrichments found.')).toBeInTheDocument();
    expect(ui.noEnrichmentsText.query()).not.toBeInTheDocument();
  });

  it('should render enrichment list items', () => {
    const enrichments = [
      createMockEnrichment({ metadata: { name: 'enrichment-1' }, spec: { title: 'Enrichment 1' } }),
      createMockEnrichment({ metadata: { name: 'enrichment-2' }, spec: { title: 'Enrichment 2' } }),
    ];

    render(<EnrichmentList {...defaultProps} enrichments={enrichments} />);

    expect(screen.getByText('Enrichment 1')).toBeInTheDocument();
    expect(screen.getByText('Enrichment 2')).toBeInTheDocument();
  });

  describe('Provisioned Enrichments', () => {
    it('displays enrichments with appropriate badges and actions', () => {
      const enrichments = [
        // Provisioned enrichment
        createMockEnrichment({
          metadata: {
            name: 'provisioned-enrichment',
            annotations: {
              [K8sAnnotations.Provenance]: 'api',
            },
          },
          spec: { title: 'Provisioned Enrichment' },
        }),
        // Non-provisioned enrichment
        createMockEnrichment({
          metadata: { name: 'normal-enrichment' },
          spec: { title: 'Normal Enrichment' },
        }),
        // Provenance "none" (treated as non-provisioned)
        createMockEnrichment({
          metadata: {
            name: 'none-provenance-enrichment',
            annotations: {
              [K8sAnnotations.Provenance]: 'none',
            },
          },
          spec: { title: 'None Provenance Enrichment' },
        }),
      ];

      render(<EnrichmentList {...defaultProps} enrichments={enrichments} />);

      // Should show provisioned badge only for provisioned enrichment
      expect(ui.provisionedBadge.get()).toBeInTheDocument();
      expect(screen.getByText('Provisioned Enrichment')).toBeInTheDocument();
      expect(screen.getByText('Normal Enrichment')).toBeInTheDocument();
      expect(screen.getByText('None Provenance Enrichment')).toBeInTheDocument();
    });

    it('handles actions appropriately for provisioned vs non-provisioned enrichments', async () => {
      const enrichments = [
        // Provisioned enrichment
        createMockEnrichment({
          metadata: {
            name: 'provisioned-enrichment',
            annotations: {
              [K8sAnnotations.Provenance]: 'api',
            },
          },
          spec: { title: 'Provisioned Enrichment' },
        }),
        // Non-provisioned enrichment
        createMockEnrichment({
          metadata: { name: 'normal-enrichment' },
          spec: { title: 'Normal Enrichment' },
        }),
      ];

      const { user } = render(<EnrichmentList {...defaultProps} enrichments={enrichments} />);

      // Should show both View button (for provisioned) and Edit button (for non-provisioned) in the actions column
      expect(screen.getByRole('button', { name: 'View enrichment Provisioned Enrichment' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit enrichment Normal Enrichment' })).toBeInTheDocument();

      // Should have exactly one delete button (for non-provisioned enrichment only)
      const deleteButtons = ui.deleteButton.getAll();
      expect(deleteButtons).toHaveLength(1); // Only one delete button (for non-provisioned)

      // Delete should work for non-provisioned enrichments
      await user.click(deleteButtons[0]);
      expect(mockOnDelete).toHaveBeenCalledWith(enrichments[1]); // Called with non-provisioned enrichment
    });

    it('should enable delete button for non-provisioned enrichments', () => {
      const enrichments = [
        createMockEnrichment({
          metadata: { name: 'normal-enrichment' },
          spec: { title: 'Normal Enrichment' },
        }),
      ];

      render(<EnrichmentList {...defaultProps} enrichments={enrichments} />);
    });
  });
});
