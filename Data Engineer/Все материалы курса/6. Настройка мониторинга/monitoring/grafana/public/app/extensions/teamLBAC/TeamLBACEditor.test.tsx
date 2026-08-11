import { waitFor } from '@testing-library/react';
import { render } from 'test/test-utils';

import { addRootReducer } from 'app/store/configureStore';

import { TeamLBACEditor } from './TeamLBACEditor';
import { teamLBACReducer } from './state/reducers';
import { mockDataSourceA, mockDataSourceB, mockEmptyTeamLBACConfig, mockTeamLBACConfig, setupMocks } from './testUtils';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: jest.fn(),
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    ...jest.requireActual('app/core/services/context_srv').contextSrv,
    hasPermission: jest.fn().mockReturnValue(true),
  },
}));

describe('TeamLBACEditor', () => {
  let mockGet: jest.Mock;

  beforeEach(() => {
    addRootReducer(teamLBACReducer);

    const mocks = setupMocks();
    mockGet = mocks.mockGet;
    mockGet.mockResolvedValue(mockTeamLBACConfig);

    jest.clearAllMocks();
  });

  describe('datasource switching', () => {
    it('should fetch LBAC rules when datasource UID changes', async () => {
      // Render with datasource A
      const { rerender } = render(<TeamLBACEditor dataSourceConfig={mockDataSourceA} onTeamLBACUpdate={jest.fn()} />);

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-a/lbac/teams');
      });

      // Clear mock to verify the next call
      mockGet.mockClear();

      // Configure mock to return different rules for datasource B
      mockGet.mockResolvedValueOnce(mockEmptyTeamLBACConfig);

      // Rerender with datasource B (simulating user switching datasources)
      rerender(<TeamLBACEditor dataSourceConfig={mockDataSourceB} onTeamLBACUpdate={jest.fn()} />);

      // Should fetch rules for datasource B
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-b/lbac/teams');
      });
    });

    it('should not refetch when datasource UID has not changed', async () => {
      // Render with datasource A
      const { rerender } = render(<TeamLBACEditor dataSourceConfig={mockDataSourceA} onTeamLBACUpdate={jest.fn()} />);

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      mockGet.mockClear();

      // Rerender with same datasource (but new object reference)
      rerender(<TeamLBACEditor dataSourceConfig={{ ...mockDataSourceA }} onTeamLBACUpdate={jest.fn()} />);

      // Should not fetch again since UID hasn't changed
      await waitFor(
        () => {
          expect(mockGet).not.toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it('should fetch rules when switching from empty to populated datasource', async () => {
      // Setup: datasource A has no rules
      mockGet.mockResolvedValueOnce(mockEmptyTeamLBACConfig);

      const { rerender } = render(<TeamLBACEditor dataSourceConfig={mockDataSourceA} onTeamLBACUpdate={jest.fn()} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-a/lbac/teams');
      });

      mockGet.mockClear();

      // Setup: datasource B has rules
      mockGet.mockResolvedValueOnce(mockTeamLBACConfig);

      // Switch to datasource B
      rerender(<TeamLBACEditor dataSourceConfig={mockDataSourceB} onTeamLBACUpdate={jest.fn()} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-b/lbac/teams');
      });
    });

    it('should fetch rules when switching from populated to empty datasource', async () => {
      // Setup: datasource A has rules
      mockGet.mockResolvedValueOnce(mockTeamLBACConfig);

      const { rerender } = render(<TeamLBACEditor dataSourceConfig={mockDataSourceA} onTeamLBACUpdate={jest.fn()} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-a/lbac/teams');
      });

      mockGet.mockClear();

      // Setup: datasource B has no rules
      mockGet.mockResolvedValueOnce(mockEmptyTeamLBACConfig);

      // Switch to datasource B
      rerender(<TeamLBACEditor dataSourceConfig={mockDataSourceB} onTeamLBACUpdate={jest.fn()} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('api/datasources/uid/datasource-b/lbac/teams');
      });
    });
  });
});
