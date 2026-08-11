import { render, screen } from 'test/test-utils';

import { useCreateQueryMutation, useUpdateQueryMutation } from 'app/extensions/api/clients/queries/v1beta1';

import { canEditQuery } from '../utils/identity';
import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';
import { hasUnresolvedVariables } from '../utils/templateVariables';

import { SavedQueriesDetailsPanel } from './SavedQueriesDetailsPanel';

// Mock sub-components that have their own test files.
jest.mock('./SavedQueryDetailActions', () => ({
  SavedQueryDetailActions: jest.fn(() => <div data-testid="detail-actions" />),
}));

jest.mock('./SavedQueryVariableAdjuster', () => ({
  SavedQueryVariableAdjuster: jest.fn(() => <div data-testid="variable-adjuster" />),
  applyTemplateVariableOverrides: jest.fn((q) => ({ query: q.query, templateVariablesChanged: false })),
}));

jest.mock('../QueryLibrary/QueryLibraryEditor', () => ({
  QueryLibraryEditor: jest.fn(() => <div data-testid="query-editor" />),
}));

jest.mock('../../../features/explore/extensions/DrilldownExtensionPoint', () => ({
  DrilldownExtensionPoint: jest.fn(() => <div data-testid="drilldown-extension" />),
}));

jest.mock('app/extensions/api/clients/queries/v1beta1', () => ({
  useUpdateQueryMutation: jest.fn(),
  useCreateQueryMutation: jest.fn(),
}));

jest.mock('../utils/useDatasource', () => ({
  useDatasource: jest.fn(() => ({ value: null, loading: false })),
}));

jest.mock('../utils/templateVariables', () => ({
  hasUnresolvedVariables: jest.fn(),
}));

jest.mock('../utils/identity', () => ({
  canEditQuery: jest.fn(),
}));

jest.mock('../utils/navigation', () => ({
  onOpenInExplore: jest.fn(),
}));

jest.mock('../utils/mappers', () => ({
  convertAddQueryTemplateCommandToDataQuerySpec: jest.fn().mockReturnValue({}),
}));

jest.mock('..', () => ({
  showDiscardAddQueryModal: jest.fn(),
}));

const mockCanEditQuery = canEditQuery as jest.MockedFunction<typeof canEditQuery>;
const mockHasUnresolvedVariables = hasUnresolvedVariables as jest.MockedFunction<typeof hasUnresolvedVariables>;
const mockUpdateQuery = jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });
const mockCreateQuery = jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });

const mockSetIsEditingQuery = jest.fn();
const mockClearCloseGuard = jest.fn();
const mockCloseDrawer = jest.fn();
const mockOnSelectQuery = jest.fn();
const mockSetNewQuery = jest.fn();
const mockTriggerAnalyticsEvent = jest.fn();

let mockContext = { ...mockQueryLibraryContext };

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => mockContext,
}));

describe('SavedQueriesDetailsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      ...mockQueryLibraryContext,
      isEditingQuery: false,
      setIsEditingQuery: mockSetIsEditingQuery,
      clearCloseGuard: mockClearCloseGuard,
      closeDrawer: mockCloseDrawer,
      onSelectQuery: mockOnSelectQuery,
      setNewQuery: mockSetNewQuery,
      triggerAnalyticsEvent: mockTriggerAnalyticsEvent,
      context: 'explore',
      templateVariableOverrides: {},
    };
    mockCanEditQuery.mockReturnValue(true);
    mockHasUnresolvedVariables.mockReturnValue(false);
    (useUpdateQueryMutation as jest.Mock).mockReturnValue([mockUpdateQuery, { isLoading: false }]);
    (useCreateQueryMutation as jest.Mock).mockReturnValue([mockCreateQuery, { isLoading: false }]);
  });

  // --- View mode ---

  it('renders a form with the query title in its aria-label', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('form', { name: /template0/i })).toBeInTheDocument();
  });

  it('renders the query title as a heading', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('heading', { name: mockSavedQuery.title })).toBeInTheDocument();
  });

  it('renders metadata inputs for datasource, description, and author', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByDisplayValue(mockSavedQuery.datasourceName!)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockSavedQuery.description!)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockSavedQuery.user!.displayName!)).toBeInTheDocument();
  });

  it('renders SavedQueryDetailActions', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByTestId('detail-actions')).toBeInTheDocument();
  });

  it('renders Edit and Select query buttons in view mode', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select query' })).toBeInTheDocument();
  });

  it('disables Edit button when canEditQuery returns false', () => {
    mockCanEditQuery.mockReturnValue(false);
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });

  it('clicking Edit calls setIsEditingQuery(true)', async () => {
    const { user } = render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(mockSetIsEditingQuery).toHaveBeenCalledWith(true);
  });

  it('clicking Select query calls onSelectQuery and closeDrawer', async () => {
    const { user } = render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Select query' }));
    expect(mockOnSelectQuery).toHaveBeenCalled();
    expect(mockCloseDrawer).toHaveBeenCalledWith(true);
  });

  it('shows Edit in Explore button when context is explore and query has uid', () => {
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Edit in Explore' })).toBeInTheDocument();
  });

  it('does not show Edit in Explore when context is not explore', () => {
    mockContext.context = 'unknown';
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Edit in Explore' })).not.toBeInTheDocument();
  });

  it('shows the variable adjuster when hasUnresolvedVariables is true and not editing', () => {
    mockHasUnresolvedVariables.mockReturnValue(true);
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByTestId('variable-adjuster')).toBeInTheDocument();
  });

  it('does not show the variable adjuster when hasUnresolvedVariables is false', () => {
    mockHasUnresolvedVariables.mockReturnValue(false);
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.queryByTestId('variable-adjuster')).not.toBeInTheDocument();
  });

  it('calls onTitleChange(undefined) on mount when not editing', () => {
    const onTitleChange = jest.fn();
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onTitleChange={onTitleChange} onSaveNew={jest.fn()} />);
    expect(onTitleChange).toHaveBeenCalledWith(undefined);
  });

  // --- Edit mode ---

  it('shows a title input with the query title value when editing', () => {
    mockContext.isEditingQuery = true;
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByDisplayValue(mockSavedQuery.title!)).toBeInTheDocument();
  });

  it('shows Cancel and Save buttons when editing', () => {
    mockContext.isEditingQuery = true;
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows Save and close button label when context is unknown and editing', () => {
    mockContext.isEditingQuery = true;
    mockContext.context = 'unknown';
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Save and close' })).toBeInTheDocument();
  });

  it('submitting the form calls updateQuery for an existing query', async () => {
    mockContext.isEditingQuery = true;
    const { user } = render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateQuery).toHaveBeenCalledWith(expect.objectContaining({ name: mockSavedQuery.uid }));
  });

  it('submitting the form calls createQuery for a new query', async () => {
    mockContext.isEditingQuery = true;
    const newQuery = { ...mockSavedQuery, uid: undefined };
    const { user } = render(<SavedQueriesDetailsPanel query={newQuery} onSaveNew={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockCreateQuery).toHaveBeenCalled();
  });

  it('calls onSaveNew with the new uid after a successful create', async () => {
    mockContext.isEditingQuery = true;
    (useCreateQueryMutation as jest.Mock).mockReturnValue([
      jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({ metadata: { name: 'new-uid-123' } }) }),
      { isLoading: false },
    ]);
    const onSaveNew = jest.fn();
    const newQuery = { ...mockSavedQuery, uid: undefined };
    const { user } = render(<SavedQueriesDetailsPanel query={newQuery} onSaveNew={onSaveNew} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveNew).toHaveBeenCalledWith('new-uid-123');
  });

  it('calls onTitleChange with the title value on mount when editing', () => {
    mockContext.isEditingQuery = true;
    const onTitleChange = jest.fn();
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onTitleChange={onTitleChange} onSaveNew={jest.fn()} />);
    expect(onTitleChange).toHaveBeenCalledWith(mockSavedQuery.title);
  });

  it('does not show the variable adjuster in edit mode even when hasUnresolvedVariables is true', () => {
    mockContext.isEditingQuery = true;
    mockHasUnresolvedVariables.mockReturnValue(true);
    render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.queryByTestId('variable-adjuster')).not.toBeInTheDocument();
  });

  // --- Close guard ---

  it('shows the close guard when Cancel is clicked on a new query with dirty fields', async () => {
    mockContext.isEditingQuery = true;
    const newQuery = { ...mockSavedQuery, uid: undefined };
    const { user } = render(<SavedQueriesDetailsPanel query={newQuery} onSaveNew={jest.fn()} />);
    const titleInput = screen.getByDisplayValue(newQuery.title!);
    await user.clear(titleInput);
    await user.type(titleInput, 'Edited title');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Discard changes to query?' })).toBeInTheDocument();
  });

  it('clicking Discard in the close guard does not save the query', async () => {
    mockContext.isEditingQuery = true;
    const { user } = render(<SavedQueriesDetailsPanel query={mockSavedQuery} onSaveNew={jest.fn()} />);
    // Make the form dirty by changing the title
    const titleInput = screen.getByDisplayValue(mockSavedQuery.title!);
    await user.clear(titleInput);
    await user.type(titleInput, 'Changed title');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Discard changes to query?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(mockUpdateQuery).not.toHaveBeenCalled();
    expect(mockSetIsEditingQuery).toHaveBeenCalledWith(false);
  });

  it('clicking Discard closes the drawer when openedToSaveQuery is true', async () => {
    mockContext.isEditingQuery = true;
    mockContext.openedToSaveQuery = true;
    const newQuery = { ...mockSavedQuery, uid: undefined };
    const { user } = render(<SavedQueriesDetailsPanel query={newQuery} onSaveNew={jest.fn()} />);
    const titleInput = screen.getByDisplayValue(newQuery.title!);
    await user.clear(titleInput);
    await user.type(titleInput, 'Changed title');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(mockClearCloseGuard).toHaveBeenCalled();
    expect(mockCloseDrawer).toHaveBeenCalledWith(false, false);
  });
});
