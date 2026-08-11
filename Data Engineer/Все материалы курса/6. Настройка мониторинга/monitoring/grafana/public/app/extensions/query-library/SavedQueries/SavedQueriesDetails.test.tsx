import { render, screen } from '@testing-library/react';

import { mockSavedQuery } from '../utils/mocks';

import { SavedQueriesDetails } from './SavedQueriesDetails';

jest.mock('./SavedQueriesDetailsPanel', () => ({
  SavedQueriesDetailsPanel: jest.fn(() => <div data-testid="details-panel" />),
}));

describe('SavedQueriesDetails', () => {
  it('renders nothing when no query is selected', () => {
    render(<SavedQueriesDetails selectedQuery={undefined} onSaveNew={jest.fn()} />);
    expect(screen.queryByTestId('details-panel')).not.toBeInTheDocument();
  });

  it('renders the details panel when a query is selected', () => {
    render(<SavedQueriesDetails selectedQuery={mockSavedQuery} onSaveNew={jest.fn()} />);
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });
});
