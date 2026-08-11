import { VariableRefresh } from '@grafana/data';
import { type Spec as DashboardV2Spec } from '@grafana/schema/apis/dashboard.grafana.app/v2';
import { handyTestingSchema } from '@grafana/schema/apis/dashboard.grafana.app/v2/examples';
import { ensureV1Response } from 'app/features/dashboard/api/ResponseTransformers';
import { setDashboardAPI } from 'app/features/dashboard/api/dashboard_api';
import { type DashboardWithAccessInfo } from 'app/features/dashboard/api/types';
import { variableAdapters } from 'app/features/variables/adapters';
import { createAdHocVariableAdapter } from 'app/features/variables/adhoc/adapter';
import { createConstantVariableAdapter } from 'app/features/variables/constant/adapter';
import { createCustomVariableAdapter } from 'app/features/variables/custom/adapter';
import { createDataSourceVariableAdapter } from 'app/features/variables/datasource/adapter';
import { createIntervalVariableAdapter } from 'app/features/variables/interval/adapter';
import { createQueryVariableAdapter } from 'app/features/variables/query/adapter';
import { createTextBoxVariableAdapter } from 'app/features/variables/textbox/adapter';
import { type DashboardDTO } from 'app/types/dashboard';

import { reduxTester } from '../../../../test/core/redux/reduxTester';
import { type ReportsState } from '../../types';

import { initVariables } from './actions';
import { reportsReducers, setLastUid } from './reducers';

// Mock dependencies
jest.mock('app/features/variables/state/actions', () => ({
  initVariablesTransaction: jest.fn(() => async () => Promise.resolve()),
}));

jest.mock('app/features/dashboard/services/TimeSrv', () => ({
  getTimeSrv: () => ({
    setTime: jest.fn(),
  }),
}));

// Mock DashboardModel to avoid Redux state dependencies
// We create a simple mock that returns an object with the properties we need
jest.mock('app/features/dashboard/state/DashboardModel', () => {
  return {
    DashboardModel: jest.fn().mockImplementation((dashboard: any, meta?: any) => {
      // Return a plain object with the properties that initVariables uses
      return {
        uid: dashboard?.uid || meta?.uid || null,
        panels: dashboard?.panels || [],
        templating: {
          list: dashboard?.templating?.list || [],
        },
        time: dashboard?.time || { from: 'now-6h', to: 'now' },
        // Add other properties that might be accessed
        meta: meta || {},
        title: dashboard?.title || '',
      };
    }),
  };
});

// Register variable adapters for tests
variableAdapters.setInit(() => [
  createQueryVariableAdapter(),
  createCustomVariableAdapter(),
  createTextBoxVariableAdapter(),
  createConstantVariableAdapter(),
  createDataSourceVariableAdapter(),
  createIntervalVariableAdapter(),
  createAdHocVariableAdapter(),
]);

describe('initVariables', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to allow expected errors for variable types without adapters (groupby, switch)
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    setDashboardAPI(undefined);
  });

  describe('with a v1 dashboard', () => {
    it('should initialize variables correctly with a v1 dashboard', async () => {
      const dashboardUid = 'test-dashboard-uid';
      const mockDashboardDTO: DashboardDTO = {
        meta: {
          uid: dashboardUid,
          canEdit: true,
          canSave: true,
        },
        dashboard: {
          uid: dashboardUid,
          title: 'Test Dashboard',
          schemaVersion: 0,
          panels: [
            {
              id: 1,
              type: 'graph',
              title: 'Panel 1',
              repeat: 'var1',
              gridPos: { x: 0, y: 0, w: 12, h: 8 },
            },
          ],
          templating: {
            list: [
              {
                name: 'var1',
                type: 'query',
                query: 'test query',
                current: { value: 'value1', text: 'Value 1' },
                options: [],
                hide: 0,
                skipUrlSync: false,
                index: 0,
                state: 'Done' as any,
                error: null,
                description: undefined,
                datasource: undefined,
                refresh: VariableRefresh.never,
                multi: false,
                includeAll: false,
              } as any,
            ],
          },
          time: { from: 'now-6h', to: 'now' },
        },
      };

      const mockAPI = {
        getDashboardDTO: jest.fn().mockResolvedValue(mockDashboardDTO),
      };

      // When feature flags are enabled, getDashboardAPI('v1') returns v1
      setDashboardAPI({ v1: mockAPI as any });

      const tester = await reduxTester<{ reports: ReportsState }>()
        .givenRootReducer((state = { reports: reportsReducers(undefined, { type: '@@INIT' } as any) }, action) => ({
          reports: reportsReducers(state.reports, action),
        }))
        .whenAsyncActionIsDispatched(initVariables(dashboardUid));

      expect(mockAPI.getDashboardDTO).toHaveBeenCalledWith(dashboardUid);

      tester.thenDispatchedActionsPredicateShouldEqual((actions) => {
        // Verify setLastUid was dispatched
        const setLastUidAction = actions.find((a) => a.type === setLastUid.type);
        expect(setLastUidAction).toBeDefined();
        expect(setLastUidAction?.payload).toBe(dashboardUid);
        return true;
      });
    });

    it('should initialize variables correctly with a v2 dashboard converted to v1', async () => {
      const dashboardUid = 'test-dashboard-v2-uid';

      // Create a v2 dashboard with variables using handyTestingSchema
      const dashboardV2: DashboardWithAccessInfo<DashboardV2Spec> = {
        apiVersion: 'v2beta1',
        kind: 'DashboardWithAccessInfo',
        metadata: {
          creationTimestamp: '2023-01-01T00:00:00Z',
          name: dashboardUid,
          resourceVersion: '1',
          annotations: {
            'grafana.app/createdBy': 'user1',
            'grafana.app/folder': 'folder1',
          },
        },
        spec: {
          ...handyTestingSchema,
          title: 'V2 Test Dashboard',
          // Add a panel with repeat to test variable detection
          elements: {
            ...handyTestingSchema.elements,
            'panel-with-repeat': {
              kind: 'Panel',
              spec: {
                ...handyTestingSchema.elements?.[Object.keys(handyTestingSchema.elements || {})[0] || 'panel-1']?.spec,
                id: 999,
                title: 'Panel with Repeat',
                // repeat is set in GridLayoutItem, not PanelSpec
              } as any,
            },
          },
          layout: {
            kind: 'GridLayout',
            spec: {
              items: [
                {
                  kind: 'GridLayoutItem',
                  spec: {
                    x: 0,
                    y: 0,
                    width: 12,
                    height: 8,
                    repeat: {
                      value: 'queryVar',
                      mode: 'variable' as const,
                    },
                    element: {
                      kind: 'ElementReference',
                      name: 'panel-with-repeat',
                    },
                  },
                },
              ],
            },
          },
        },
        access: {
          url: `/d/${dashboardUid}`,
          canAdmin: true,
          canDelete: true,
          canEdit: true,
          canSave: true,
          canShare: true,
          canStar: true,
          slug: dashboardUid,
          annotationsPermissions: {
            dashboard: { canAdd: true, canEdit: true, canDelete: true },
          },
        },
      };

      // Convert v2 dashboard to v1 format (simulating what the API does)
      const convertedDashboardDTO = ensureV1Response(dashboardV2);

      const mockAPI = {
        getDashboardDTO: jest.fn().mockResolvedValue(convertedDashboardDTO),
      };

      // When feature flags are enabled, getDashboardAPI('v1') returns v1
      setDashboardAPI({ v1: mockAPI as any });

      // Provide templateVars to avoid calling toReportVariables for variables without adapters (groupby, switch)
      const templateVars = { queryVar: ['value1'] };
      const tester = await reduxTester<{ reports: ReportsState }>()
        .givenRootReducer((state = { reports: reportsReducers(undefined, { type: '@@INIT' } as any) }, action) => ({
          reports: reportsReducers(state.reports, action),
        }))
        .whenAsyncActionIsDispatched(initVariables(dashboardUid, templateVars));

      expect(mockAPI.getDashboardDTO).toHaveBeenCalledWith(dashboardUid);

      // Verify that the converted dashboard has variables
      expect(convertedDashboardDTO.dashboard.templating?.list).toBeDefined();
      expect(convertedDashboardDTO.dashboard.templating?.list?.length).toBeGreaterThan(0);

      // Verify setLastUid was dispatched
      tester.thenDispatchedActionsPredicateShouldEqual((actions) => {
        const setLastUidAction = actions.find((a) => a.type === setLastUid.type);
        expect(setLastUidAction).toBeDefined();
        expect(setLastUidAction?.payload).toBe(dashboardUid);
        return true;
      });
    });
  });
});
