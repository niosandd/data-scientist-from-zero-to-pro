import { screen, waitFor } from '@testing-library/react';
import { render } from 'test/test-utils';

import { canEditQuery, hasWritePermissions } from '../utils/identity';
import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { SavedQueryDetailActions } from './SavedQueryDetailActions';

const mockDeleteQuery = jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });

jest.mock('app/extensions/api/clients/queries/v1beta1', () => ({
  useDeleteQueryMutation: () => [mockDeleteQuery, { isLoading: false }],
}));

jest.mock('../utils/identity', () => ({
  canEditQuery: jest.fn().mockReturnValue(true),
  hasWritePermissions: jest.fn().mockReturnValue(true),
}));

const mockCanEditQuery = canEditQuery as jest.MockedFunction<typeof canEditQuery>;
const mockHasWritePermissions = hasWritePermissions as jest.MockedFunction<typeof hasWritePermissions>;

const mockOnAddHistoryQueryToLibrary = jest.fn();
const mockTriggerAnalyticsEvent = jest.fn();

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => ({
    ...mockQueryLibraryContext,
    onAddHistoryQueryToLibrary: mockOnAddHistoryQueryToLibrary,
    triggerAnalyticsEvent: mockTriggerAnalyticsEvent,
  }),
}));

describe('SavedQueryDetailActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanEditQuery.mockReturnValue(true);
    mockHasWritePermissions.mockReturnValue(true);
    mockDeleteQuery.mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });
  });

  it('disables duplicate when user lacks write permissions', () => {
    mockHasWritePermissions.mockReturnValue(false);
    render(<SavedQueryDetailActions query={mockSavedQuery} />);

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
  });

  it('disables delete when user cannot edit the query', () => {
    mockCanEditQuery.mockReturnValue(false);
    render(<SavedQueryDetailActions query={mockSavedQuery} />);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('disables both buttons when disabled prop is true', () => {
    render(<SavedQueryDetailActions query={mockSavedQuery} disabled />);

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('clicking duplicate calls onAddHistoryQueryToLibrary with uid cleared and default title', async () => {
    const { user } = render(<SavedQueryDetailActions query={mockSavedQuery} />);

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));

    expect(mockOnAddHistoryQueryToLibrary).toHaveBeenCalledWith({
      ...mockSavedQuery,
      uid: undefined,
      title: 'New query',
    });
  });

  it('clicking delete opens the confirmation modal', async () => {
    const { user } = render(<SavedQueryDetailActions query={mockSavedQuery} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('dialog', { name: 'Delete query' })).toBeInTheDocument();
  });

  it('cancelling the delete confirmation closes the modal without deleting', async () => {
    const { user } = render(<SavedQueryDetailActions query={mockSavedQuery} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockDeleteQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Delete query' })).not.toBeInTheDocument();
  });

  it('confirming delete calls deleteQuery and then onDelete', async () => {
    const onDelete = jest.fn();
    const { user } = render(<SavedQueryDetailActions query={mockSavedQuery} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete query' }));

    await waitFor(() => expect(mockDeleteQuery).toHaveBeenCalledWith({ name: mockSavedQuery.uid }));
    expect(onDelete).toHaveBeenCalled();
  });
});
