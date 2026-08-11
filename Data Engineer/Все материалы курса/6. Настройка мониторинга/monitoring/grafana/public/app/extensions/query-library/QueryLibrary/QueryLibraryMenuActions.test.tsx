import { screen } from '@testing-library/react';
import { render } from 'test/test-utils';

import { mockSavedQuery } from '../utils/mocks';

import { QueryLibraryMenuActions, type QueryLibraryMenuActionsProps } from './QueryLibraryMenuActions';

const mockTriggerAnalyticsEvent = jest.fn();
const mockOnEditQuerySuccess = jest.fn();
const mockUseQueryLibraryContext = jest.fn(() => ({
  triggerAnalyticsEvent: mockTriggerAnalyticsEvent,
  onAddHistoryQueryToLibrary: jest.fn(),
}));

jest.mock('app/features/explore/QueryLibrary/QueryLibraryContext', () => ({
  useQueryLibraryContext: () => mockUseQueryLibraryContext(),
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    user: { uid: 'JohnDoe' },
    hasRole: jest.fn(() => true),
  },
}));

jest.mock('../utils/identity', () => ({
  canEditQuery: jest.fn().mockReturnValue(true),
  hasWritePermissions: jest.fn().mockReturnValue(true),
}));

describe('QueryLibraryMenuActions', () => {
  const defaultProps: QueryLibraryMenuActionsProps = {
    selectedQueryRow: mockSavedQuery,
    onEditQuerySuccess: mockOnEditQuerySuccess,
  };

  const lockedQueryTemplateRow = {
    ...mockSavedQuery,
    isLocked: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryLibraryContext.mockReturnValue({
      triggerAnalyticsEvent: mockTriggerAnalyticsEvent,
      onAddHistoryQueryToLibrary: jest.fn(),
    });
  });

  it('should disable delete and lock buttons when user does not have permissions', () => {
    jest.mocked(require('app/core/services/context_srv').contextSrv.hasRole).mockReturnValue(false);
    jest.mocked(require('../utils/identity').canEditQuery).mockReturnValue(false);

    render(<QueryLibraryMenuActions {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Lock query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete query' })).toBeDisabled();
  });

  it('should show lock button when query is not locked', async () => {
    render(<QueryLibraryMenuActions {...defaultProps} />);

    expect(screen.getByLabelText('Lock query')).toBeInTheDocument();
    expect(screen.queryByLabelText('Unlock query')).not.toBeInTheDocument();
  });

  it('should show unlock button when query is locked', async () => {
    render(<QueryLibraryMenuActions {...defaultProps} selectedQueryRow={lockedQueryTemplateRow} />);

    expect(screen.getByLabelText('Unlock query')).toBeInTheDocument();
    expect(screen.queryByLabelText('Lock query')).not.toBeInTheDocument();
  });

  it('should disable delete button when query is locked', async () => {
    render(<QueryLibraryMenuActions {...defaultProps} selectedQueryRow={lockedQueryTemplateRow} />);

    const deleteButton = screen.getByLabelText('Delete query');
    expect(deleteButton).toBeDisabled();
  });

  it('should disable duplicate and delete button when user is a viewer, even though they are the author', () => {
    jest.mocked(require('../utils/identity').canEditQuery).mockReturnValue(false);
    jest.mocked(require('../utils/identity').hasWritePermissions).mockReturnValue(false);

    render(<QueryLibraryMenuActions {...defaultProps} />);

    expect(screen.queryByLabelText('Delete query')).toBeDisabled();
    expect(screen.queryByLabelText('Duplicate query')).toBeDisabled();
  });
});
