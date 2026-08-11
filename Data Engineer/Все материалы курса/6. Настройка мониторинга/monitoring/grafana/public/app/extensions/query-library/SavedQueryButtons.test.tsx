import { act, screen, waitFor } from '@testing-library/react';
import { useLocalStorage } from 'react-use';
import { render } from 'test/test-utils';

import { OrgRole } from '@grafana/data';
import { contextSrv } from 'app/core/services/context_srv';

import { SavedQueryButtons } from './SavedQueryButtons';
import { selectors } from './e2e-selectors/selectors';
import { mockQuery } from './utils/mocks';

jest.mock('react-use', () => ({
  ...jest.requireActual('react-use'),
  useLocalStorage: jest.fn(),
  useMeasure: () => [() => {}, { width: 1000, height: 100 }],
}));

const mockGetDataSourceSrv = jest.fn();

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: () => {
    return {
      get: mockGetDataSourceSrv,
    };
  },
}));

jest.mock('app/core/hooks/useMediaQueryMinWidth', () => ({
  useMediaQueryMinWidth: jest.fn(() => true),
}));

// Mock contextSrv
jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    user: {
      uid: 'user123',
      role: 'Editor',
    },
    isEditor: true,
    isSignedIn: true,
    hasPermission: jest.fn(),
  },
}));

const mockContextSrv = jest.mocked(contextSrv);

const mockUseLocalStorage = useLocalStorage as jest.Mock;

beforeEach(() => {
  (mockContextSrv.user as any) = { uid: 'user123', role: OrgRole.Editor };
  mockContextSrv.isEditor = true;
  // Default mock: datasource exists
  mockGetDataSourceSrv.mockResolvedValue({});
});

describe('SaveQueryButton', () => {
  it('should render badge for the first time', async () => {
    mockUseLocalStorage.mockReturnValue([true, jest.fn()]);

    render(<SavedQueryButtons query={mockQuery} datasourceFilters={[]} />);
    await waitFor(() => {
      expect(screen.getByText('New!')).toBeInTheDocument();
    });
  });

  it('should render save and replace buttons after the first time', async () => {
    mockUseLocalStorage.mockReturnValue([false, jest.fn()]);
    const { user } = render(<SavedQueryButtons query={mockQuery} datasourceFilters={[]} />);

    const dropdownButton = await waitFor(() => {
      return screen.getByTestId(selectors.components.savedQueriesMenuButton.button);
    });

    await user.click(dropdownButton);

    expect(await waitFor(() => screen.getByTestId(selectors.components.saveQueryButton.button))).toBeInTheDocument();
    expect(await waitFor(() => screen.getByTestId(selectors.components.replaceQueryButton.button))).toBeInTheDocument();
  });

  it('should not render save button for viewer but render replace button', async () => {
    mockUseLocalStorage.mockReturnValue([true, jest.fn()]);
    contextSrv.user.orgRole = OrgRole.Viewer;
    contextSrv.isEditor = false;
    const { user } = render(<SavedQueryButtons query={mockQuery} datasourceFilters={[]} />);

    const dropdownButton = await waitFor(() => {
      return screen.getByTestId(selectors.components.savedQueriesMenuButton.button);
    });
    await user.click(dropdownButton);

    expect(screen.queryByTestId(selectors.components.saveQueryButton.button)).not.toBeInTheDocument();
    expect(screen.getByTestId(selectors.components.replaceQueryButton.button)).toBeInTheDocument();
  });

  it('should not render buttons if datasource does not exist', async () => {
    mockUseLocalStorage.mockReturnValue([true, jest.fn()]);
    // Mock datasource service to return null (datasource doesn't exist)
    mockGetDataSourceSrv.mockResolvedValue(null);

    await act(async () => {
      render(
        <SavedQueryButtons query={{ ...mockQuery, datasource: { uid: 'does-not-exist' } }} datasourceFilters={[]} />
      );
    });
    expect(screen.queryByTestId(selectors.components.savedQueriesMenuButton.button)).not.toBeInTheDocument();
  });

  it('should render save and replace buttons as buttons in the header when showAsButtonHeader is true', async () => {
    mockUseLocalStorage.mockReturnValue([false, jest.fn()]);
    render(<SavedQueryButtons query={mockQuery} datasourceFilters={[]} showAsButtonHeader={true} />);

    expect(await waitFor(() => screen.getByTestId(selectors.components.saveQueryButton.button))).toBeInTheDocument();
    expect(await waitFor(() => screen.getByTestId(selectors.components.replaceQueryButton.button))).toBeInTheDocument();
  });

  it('should not render save button but render replace button when user has read but not write permissions', async () => {
    mockUseLocalStorage.mockReturnValue([false, jest.fn()]);
    (mockContextSrv.user as any) = { uid: 'user123', role: OrgRole.Viewer, orgRole: OrgRole.Viewer };
    mockContextSrv.isEditor = false;
    mockContextSrv.isSignedIn = true;

    render(<SavedQueryButtons query={mockQuery} datasourceFilters={[]} showAsButtonHeader={true} />);

    expect(await waitFor(() => screen.getByTestId(selectors.components.replaceQueryButton.button))).toBeInTheDocument();
    expect(screen.queryByTestId(selectors.components.saveQueryButton.button)).not.toBeInTheDocument();
  });
});
