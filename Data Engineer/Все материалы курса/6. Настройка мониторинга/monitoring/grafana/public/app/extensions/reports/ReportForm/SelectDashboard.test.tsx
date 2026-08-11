import { screen, waitFor } from '@testing-library/react';
import { render } from 'test/test-utils';

import { selectors } from '@grafana/e2e-selectors';
import { setBackendSrv } from '@grafana/runtime';
import { setupMockServer } from '@grafana/test-utils/server';
import { getFolderFixtures } from '@grafana/test-utils/unstable';
import { getRouteComponentProps } from 'app/core/navigation/mocks/routeProps';
import { backendSrv } from 'app/core/services/backend_srv';
import { addRootReducer } from 'app/store/configureStore';

import { mockToolkitActionCreator } from '../../../../test/core/redux/mocks';
import { selectOptionInTest } from '../../../../test/helpers/selectOptionInTest';
import reportsReducers, { initialState, updateReportProp } from '../state/reducers';

import { SelectDashboards, type Props } from './SelectDashboard';

const [_, { folderA, folderA_dashbdD, dashbdE }] = getFolderFixtures();

jest.mock('app/core/services/context_srv', () => {
  return {
    contextSrv: {
      ...jest.requireActual('app/core/services/context_srv').contextSrv,
      hasPermission: () => true,
    },
  };
});

const blankReport = initialState.report;
const dashboardBase = {
  id: 1,
  uid: folderA_dashbdD.item.uid,
  name: folderA_dashbdD.item.title,
};

const testReport = {
  ...blankReport,
  id: 1,
  name: 'Test report',
  subject: 'Test subject report',
  dashboardId: 1,
  dashboardName: 'Test dashboard',
  dashboards: [
    {
      dashboard: dashboardBase,
      timeRange: { to: '', from: '' },
    },
  ],
  recipients: 'test@me.com',
};

const mockUpdate = mockToolkitActionCreator(updateReportProp);

type HistoryOptions = NonNullable<Parameters<typeof render>[1]>['historyOptions'];

const setup = (propOverrides?: Partial<Props>, historyOverrides?: HistoryOptions) => {
  addRootReducer(reportsReducers);
  const props: Props = {
    ...getRouteComponentProps(),
    report: blankReport,
    updateReportProp: mockToolkitActionCreator(updateReportProp),
    initVariables: jest.fn(),
    cleanUpVariables: jest.fn(),
    templating: {},
    ...propOverrides,
  };

  return render(<SelectDashboards {...props} />, {
    historyOptions: historyOverrides,
  });
};

setBackendSrv(backendSrv);
setupMockServer();

const expectedDashAndFolderTitle = `${folderA.item.title}/${folderA_dashbdD.item.title}`;
const expectedDashAndFolderTitle2 = `Dashboards/${dashbdE.item.title}`;

describe('SelectDashboard', () => {
  it('should render', async () => {
    setup();
    expect(await screen.findByText('1. Select dashboard')).toBeInTheDocument();
  });

  it('should not update the form if nothing was entered', async () => {
    const { user } = setup({ updateReportProp: mockUpdate });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(mockUpdate).not.toBeCalled());
  });

  it('should show the available data', async () => {
    setup({ report: testReport });
    expect(await screen.findByText(expectedDashAndFolderTitle)).toBeInTheDocument();
    expect(screen.getByText('Select time range')).toBeInTheDocument();
  });

  it('should show the entered data on returning from next step', async () => {
    setup({
      report: {
        ...blankReport,
        dashboards: [
          {
            dashboard: dashboardBase,
            timeRange: { to: 'now', from: 'now-1h' },
          },
        ],
      },
    });
    expect(await screen.findByText(expectedDashAndFolderTitle)).toBeInTheDocument();
    expect(screen.getByText('Last 1 hour')).toBeInTheDocument();
  });

  it('should save the selected dashboard', async () => {
    const { user } = setup({ updateReportProp: mockUpdate });
    expect(await screen.findByRole('combobox', { name: /Source dashboard/ })).toBeInTheDocument();
    // Select dashboard
    await selectOptionInTest(screen.getByRole('combobox', { name: 'Source dashboard' }), expectedDashAndFolderTitle);

    // Select time range
    await user.click(screen.getByTestId(selectors.components.TimePicker.openButton));
    await user.click(screen.getByLabelText('Last 1 hour'));

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        ...blankReport,
        dashboards: [
          {
            dashboard: {
              uid: folderA_dashbdD.item.uid,
              name: folderA_dashbdD.item.title,
            },
            reportVariables: {},
            timeRange: { to: 'now', from: 'now-1h' },
          },
        ],
      })
    );
  });

  it('should apply params from URL and save those values', async () => {
    const { user } = setup(
      { updateReportProp: mockUpdate },
      {
        initialEntries: [
          `/?from=now-6h&to=now&db-uid=${folderA_dashbdD.item.uid}&db-id=1&db-name=${folderA_dashbdD.item.title}`,
        ],
      }
    );

    expect(await screen.findByText(expectedDashAndFolderTitle)).toBeInTheDocument();
    expect(screen.getByText('Last 6 hours')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        ...blankReport,
        dashboards: [
          {
            dashboard: {
              uid: folderA_dashbdD.item.uid,
              name: folderA_dashbdD.item.title,
            },
            reportVariables: {},
            timeRange: { to: 'now', from: 'now-6h' },
          },
        ],
      })
    );
  });

  it('should preserve unchanged dashboard time ranges when modifying another dashboard', async () => {
    // Set up report with 2 dashboards with different time ranges
    const reportWith2Dashboards = {
      ...blankReport,
      dashboards: [
        {
          dashboard: dashboardBase,
          timeRange: { to: 'now', from: 'now-1h' }, // This should remain unchanged
          reportVariables: {},
        },
        {
          dashboard: {
            uid: dashbdE.item.uid,
            name: dashbdE.item.title,
          },
          timeRange: { to: 'now', from: 'now-6h' }, // This will be modified
          reportVariables: {},
        },
      ],
    };

    const { user, rerender } = setup({
      report: reportWith2Dashboards,
      updateReportProp: mockUpdate,
    });

    // Verify both dashboards are displayed with their initial time ranges
    expect(await screen.findByText(expectedDashAndFolderTitle)).toBeInTheDocument();
    expect(await screen.findByText(expectedDashAndFolderTitle2)).toBeInTheDocument();
    expect(screen.getByText('Last 1 hour')).toBeInTheDocument();
    expect(screen.getByText('Last 6 hours')).toBeInTheDocument();

    // Simulate navigation to next step then back
    rerender(
      <SelectDashboards
        report={reportWith2Dashboards}
        updateReportProp={mockUpdate}
        initVariables={jest.fn()}
        cleanUpVariables={jest.fn()}
        templating={{}}
      />
    );

    // Change the second dashboard's time range
    const timePickerButtons = screen.getAllByTestId(selectors.components.TimePicker.openButton);
    expect(timePickerButtons).toHaveLength(2);

    // Click on the second dashboard's time picker
    await user.click(timePickerButtons[1]);
    await user.click(screen.getByLabelText('Last 24 hours'));

    // Change time range for the second dashboard
    const updatedReport = {
      ...reportWith2Dashboards,
      dashboards: [
        reportWith2Dashboards.dashboards[0],
        {
          ...reportWith2Dashboards.dashboards[1],
          timeRange: { to: 'now', from: 'now-24h' },
        },
      ],
    };

    // Simulate navigation to next step then back again
    rerender(
      <SelectDashboards
        report={updatedReport}
        updateReportProp={mockUpdate}
        initVariables={jest.fn()}
        cleanUpVariables={jest.fn()}
        templating={{}}
      />
    );

    // Verify that both time ranges remain unchanged
    expect(await screen.findByText(expectedDashAndFolderTitle)).toBeInTheDocument();
    expect(await screen.findByText(expectedDashAndFolderTitle2)).toBeInTheDocument();
    expect(screen.getByText('Last 1 hour')).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
  });
});
