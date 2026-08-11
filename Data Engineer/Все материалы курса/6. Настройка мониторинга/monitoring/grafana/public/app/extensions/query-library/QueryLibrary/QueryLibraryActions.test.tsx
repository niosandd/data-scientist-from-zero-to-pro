import { screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from 'test/test-utils';

import { OrgRole } from '@grafana/data';
import { contextSrv } from 'app/core/services/context_srv';

import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { QueryLibraryActions, type QueryLibraryActionsProps } from './QueryLibraryActions';
import { type QueryDetails } from './QueryLibraryDetails';

const mockSetNewQuery = jest.fn();
let mockContext = 'explore';
const mockCloseDrawer = jest.fn();
const mockOnSelectQuery = jest.fn();

const defaultContext = {
  ...mockQueryLibraryContext,
  setNewQuery: mockSetNewQuery,
  context: mockContext,
  closeDrawer: mockCloseDrawer,
  onSelectQuery: mockOnSelectQuery,
};

let context = defaultContext;

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => context,
}));

jest.mock('app/features/explore/extensions/DrilldownExtensionPoint', () => ({
  DrilldownExtensionPoint: ({ queries }: { queries: unknown[] }) => (
    <div data-testid="drilldown-extension-point" data-queries={JSON.stringify(queries)}>
      DrilldownExtensionPoint
    </div>
  ),
}));

describe('QueryLibraryActions', () => {
  const defaultProps: QueryLibraryActionsProps = {
    selectedQueryRow: mockSavedQuery,
    isSavingLoading: false,
    onEditQuerySuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = 'explore';
    context = defaultContext;
  });

  const QueryLibraryActionsWrapper = (props: QueryLibraryActionsProps) => {
    const methods = useForm<QueryDetails>();

    return (
      <FormProvider {...methods}>
        <QueryLibraryActions {...props} />
      </FormProvider>
    );
  };

  it('should render all action buttons not related to editing', () => {
    render(<QueryLibraryActionsWrapper {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Select query' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('should not render update and select actions when query is new', () => {
    render(<QueryLibraryActionsWrapper {...defaultProps} selectedQueryRow={{ ...mockSavedQuery, uid: undefined }} />);
    expect(screen.queryByRole('button', { name: 'Select query' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should render editing buttons when is editing query', () => {
    context.isEditingQuery = true;
    render(<QueryLibraryActionsWrapper {...defaultProps} />);
    expect(screen.queryByRole('button', { name: 'Select query' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onSelectQuery when the select button is clicked', async () => {
    context.isEditingQuery = false;
    const { user } = render(<QueryLibraryActionsWrapper {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Select query' }));
    expect(mockOnSelectQuery).toHaveBeenCalledWith(mockSavedQuery.query, mockSavedQuery.title);
  });

  it('should apply template variable overrides before selecting when template variables are detected', async () => {
    context.isEditingQuery = false;
    context.templateVariableOverrides = { '${myVar}': 'myValue' };

    const savedQueryWithVariables = {
      ...mockSavedQuery,
      query: { ...mockSavedQuery.query, expr: '${myVar}' },
    };

    const { user } = render(
      <QueryLibraryActionsWrapper {...defaultProps} selectedQueryRow={savedQueryWithVariables} />
    );
    await user.click(screen.getByRole('button', { name: 'Select query' }));

    expect(mockOnSelectQuery).toHaveBeenCalledWith(expect.objectContaining({ expr: 'myValue' }), mockSavedQuery.title);
    expect(mockCloseDrawer).toHaveBeenCalledWith(true);
    expect(context.setTemplateVariableOverrides).toHaveBeenCalledWith({});
  });

  it('should only render save recent query button when using history', () => {
    render(<QueryLibraryActionsWrapper {...defaultProps} usingHistory={true} />);
    expect(screen.getByRole('button', { name: 'Save query' })).toBeInTheDocument();
  });

  it('should not render save recent query button when not using history', () => {
    render(<QueryLibraryActionsWrapper {...defaultProps} usingHistory={false} />);
    expect(screen.queryByRole('button', { name: 'Save query' })).not.toBeInTheDocument();
  });

  it('should render save and close button when context is unknown', () => {
    context.isEditingQuery = true;
    defaultContext.context = 'unknown';
    render(<QueryLibraryActionsWrapper {...defaultProps} selectedQueryRow={{ ...mockSavedQuery, uid: undefined }} />);
    expect(screen.getByRole('button', { name: 'Save and close' })).toBeInTheDocument();
  });

  it('should call closeDrawer when context is unknown', async () => {
    const { user } = render(
      <QueryLibraryActionsWrapper {...defaultProps} selectedQueryRow={{ ...mockSavedQuery, uid: undefined }} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCloseDrawer).toHaveBeenCalled();
  });

  it('should disable save button when user is a viewer, even though they are the author', () => {
    context.context = 'explore';
    context.isEditingQuery = true;
    contextSrv.user.uid = 'viewer:JohnDoe';
    contextSrv.user.orgRole = OrgRole.Viewer;
    render(<QueryLibraryActionsWrapper {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should render DrilldownExtensionPoint when not editing and query has uid', () => {
    context.isEditingQuery = false;
    render(<QueryLibraryActionsWrapper {...defaultProps} />);

    const drilldownPoint = screen.getByTestId('drilldown-extension-point');
    expect(drilldownPoint).toBeInTheDocument();
    expect(drilldownPoint).toHaveAttribute('data-queries', JSON.stringify([mockSavedQuery.query]));
  });

  it('should not render DrilldownExtensionPoint when editing query', () => {
    context.isEditingQuery = true;
    render(<QueryLibraryActionsWrapper {...defaultProps} />);

    expect(screen.queryByTestId('drilldown-extension-point')).not.toBeInTheDocument();
  });

  it('should not render DrilldownExtensionPoint when query has no uid', () => {
    context.isEditingQuery = false;
    render(<QueryLibraryActionsWrapper {...defaultProps} selectedQueryRow={{ ...mockSavedQuery, uid: undefined }} />);

    expect(screen.queryByTestId('drilldown-extension-point')).not.toBeInTheDocument();
  });

  it('should not render DrilldownExtensionPoint when context is drilldown', () => {
    context.isEditingQuery = false;
    context.context = 'drilldown';
    render(<QueryLibraryActionsWrapper {...defaultProps} />);

    expect(screen.queryByTestId('drilldown-extension-point')).not.toBeInTheDocument();
  });
});
