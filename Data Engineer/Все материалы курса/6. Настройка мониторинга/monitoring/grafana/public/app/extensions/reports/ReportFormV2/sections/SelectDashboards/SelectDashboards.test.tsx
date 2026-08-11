import { act, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { render } from 'test/test-utils';

import { getDefaultTimeRange } from '@grafana/data';
import { config, setBackendSrv } from '@grafana/runtime';
import {
  SceneTimeRange,
  SceneVariableSet,
  TestVariable,
  VariableValueSelectors,
  SceneDataLayerControls,
} from '@grafana/scenes';
import { setupMockServer } from '@grafana/test-utils/server';
import { getFolderFixtures } from '@grafana/test-utils/unstable';
import { backendSrv } from 'app/core/services/backend_srv';
import { type ReportFormV2 } from 'app/extensions/types';

import { SelectDashboardScene, type SelectDashboardState } from './SelectDashboardScene';
import SelectDashboards from './SelectDashboards';

setBackendSrv(backendSrv);
setupMockServer();
const [_, { dashbdD, dashbdE }] = getFolderFixtures();

jest.mock('app/core/services/context_srv', () => {
  return {
    contextSrv: {
      ...jest.requireActual('app/core/services/context_srv').contextSrv,
      hasPermission: () => true,
    },
  };
});

const mockOnAddDashboard = jest.fn();
const mockOnRemoveDashboard = jest.fn();

const getSelectDashboardScene = (state?: Partial<SelectDashboardState>): SelectDashboardScene => {
  const varA = new TestVariable({ name: 'A', query: 'A.*', value: 'A.AA', text: '', options: [], delayMs: 0 });
  const timeRange = getDefaultTimeRange();

  return new SelectDashboardScene({
    uid: dashbdD.item.uid,
    title: dashbdD.item.title,
    $timeRange: new SceneTimeRange({
      timeZone: 'browser',
      from: timeRange.from.toISOString(),
      to: timeRange.to.toISOString(),
    }),
    $variables: new SceneVariableSet({ variables: [varA] }),
    variableControls: [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()],
    ...state,
  });
};

const SelectDashboardsWrapper = ({ dashboards }: { dashboards?: SelectDashboardScene[] }) => {
  const methods = useForm<ReportFormV2>({
    defaultValues: {
      dashboards:
        dashboards?.map((d) => ({ uid: d.state.uid, key: d.state.key, timeRange: d.state.$timeRange?.state.value })) ||
        [],
    },
  });

  return (
    <FormProvider {...methods}>
      <SelectDashboards
        dashboards={dashboards || []}
        onAddDashboard={mockOnAddDashboard}
        open={true}
        onToggle={() => {}}
      />
    </FormProvider>
  );
};

async function setup(dashboards: SelectDashboardScene[] = []) {
  return await act(async () => render(<SelectDashboardsWrapper dashboards={dashboards} />));
}

describe('SelectDashboards', () => {
  const originalFeatureToggles = { ...config.featureToggles };

  beforeEach(() => {
    // Reset feature flags before each test
    config.featureToggles = { ...originalFeatureToggles };
  });

  afterEach(() => {
    // Restore original feature flags after each test
    config.featureToggles = { ...originalFeatureToggles };
  });

  it('should call onAddDashboard when clicking add button', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: /add dashboard/i }));

    expect(mockOnAddDashboard).toHaveBeenCalled();
  });

  it('should call onRemoveDashboard with correct index when removing dashboard', async () => {
    const dashboards = [
      getSelectDashboardScene({
        uid: dashbdD.item.uid,
        title: dashbdD.item.title,
        onRemoveClick: mockOnRemoveDashboard,
      }),
      getSelectDashboardScene({ uid: dashbdE.item.uid, title: dashbdE.item.title }),
    ];

    const { user } = await setup(dashboards);

    await user.click(screen.getAllByRole('button', { name: /delete this dashboard/i })[0]);

    expect(mockOnRemoveDashboard).toHaveBeenCalledWith(dashboards[0]);
  });

  it('should show template variables section when dashboard has variables', async () => {
    const varA = new TestVariable({ name: 'A', query: 'A.*', value: 'A.AA', text: '', options: [], delayMs: 0 });

    await setup([getSelectDashboardScene({ $variables: new SceneVariableSet({ variables: [varA] }) })]);

    expect(screen.getByText(/customize template variables/i)).toBeInTheDocument();
  });

  it('should show temp variables warning when same dashboard is added multiple times', async () => {
    const dashboards = Array(3)
      .fill(null)
      .map(() => getSelectDashboardScene());

    await setup(dashboards);

    const alerts = screen.getAllByText(/template variables that you selected first are applied to all instances/i);
    expect(alerts).toHaveLength(2);
  });

  describe('when dashboardNewLayouts feature flag is enabled', () => {
    beforeEach(() => {
      config.featureToggles.dashboardNewLayouts = true;
    });

    it('should render dashboard variables when dashboard has variables and variableControls', async () => {
      const varA = new TestVariable({
        name: 'testVariable',
        query: 'test.*',
        value: 'test.value',
        text: 'test value',
        options: [],
        delayMs: 0,
      });

      const scene = getSelectDashboardScene({
        uid: dashbdD.item.uid,
        title: dashbdD.item.title,
        $variables: new SceneVariableSet({ variables: [varA] }),
        variableControls: [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()],
      });

      // Activate the scene to ensure it's properly initialized
      scene.activate();

      await setup([scene]);

      // Verify that the template variables section is visible
      expect(screen.getByText(/customize template variables/i)).toBeInTheDocument();

      // Verify that variable controls are rendered
      // VariableValueSelectors should render the variable, which should include the variable name
      // The variable name should appear in the rendered output
      expect(screen.getByText(/testVariable/i)).toBeInTheDocument();
    });

    it('should render variable controls when dashboardNewLayouts is enabled', async () => {
      const varA = new TestVariable({
        name: 'myVar',
        query: 'query.*',
        value: 'query.value',
        text: 'query value',
        options: [],
        delayMs: 0,
      });

      const scene = getSelectDashboardScene({
        $variables: new SceneVariableSet({ variables: [varA] }),
        variableControls: [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()],
      });

      scene.activate();

      await setup([scene]);

      // The variable controls section should be visible
      const templateVariablesSection = screen.getByText(/customize template variables/i);
      expect(templateVariablesSection).toBeInTheDocument();

      // VariableValueSelectors should render the variable
      // Check that the variable name appears (this indicates the variable control is rendered)
      expect(screen.getByText(/myVar/i)).toBeInTheDocument();
    });

    it('should render VariableValueSelectors component when dashboardNewLayouts is enabled', async () => {
      const varA = new TestVariable({
        name: 'dashboardVar',
        query: 'dashboard.*',
        value: 'dashboard.value',
        text: 'dashboard value',
        options: [],
        delayMs: 0,
      });

      const variableControls = [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()];

      const scene = getSelectDashboardScene({
        $variables: new SceneVariableSet({ variables: [varA] }),
        variableControls,
      });

      scene.activate();

      await setup([scene]);

      // Verify the CollapsableSection for template variables is rendered
      expect(screen.getByText(/customize template variables/i)).toBeInTheDocument();

      // Verify that VariableValueSelectors component is rendered by checking for the variable
      // The VariableValueSelectors should render the variable component which displays the variable name
      expect(screen.getByText(/dashboardVar/i)).toBeInTheDocument();
    });

    it('should render variable controls in the CollapsableSection when dashboardNewLayouts is enabled', async () => {
      const varA = new TestVariable({
        name: 'featureFlagVar',
        query: 'feature.*',
        value: 'feature.value',
        text: 'feature value',
        options: [],
        delayMs: 0,
      });

      const scene = getSelectDashboardScene({
        $variables: new SceneVariableSet({ variables: [varA] }),
        variableControls: [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()],
      });

      scene.activate();

      await setup([scene]);

      // This test verifies that when dashboardNewLayouts is enabled,
      // the variable controls (VariableValueSelectors) are rendered inside the CollapsableSection
      // This test should fail if the feature flag check is missing in SelectDashboardRenderer

      // Verify the CollapsableSection is present
      expect(screen.getByText(/customize template variables/i)).toBeInTheDocument();

      // Verify that VariableValueSelectors component rendered the variable
      // This is the key assertion - if dashboardNewLayouts check is missing, variables won't render
      expect(screen.getByText(/featureFlagVar/i)).toBeInTheDocument();
    });
  });

  describe('when dashboardNewLayouts feature flag is disabled', () => {
    beforeEach(() => {
      config.featureToggles.dashboardNewLayouts = false;
    });

    it('should still show template variables section when dashboard has variables (backward compatibility)', async () => {
      const varA = new TestVariable({
        name: 'testVar',
        query: 'test.*',
        value: 'test.value',
        text: 'test value',
        options: [],
        delayMs: 0,
      });

      const scene = getSelectDashboardScene({
        $variables: new SceneVariableSet({ variables: [varA] }),
        variableControls: [new VariableValueSelectors({ layout: 'vertical' }), new SceneDataLayerControls()],
      });

      scene.activate();

      await setup([scene]);

      // Template variables section should still be visible for backward compatibility
      expect(screen.getByText(/customize template variables/i)).toBeInTheDocument();
    });
  });
});
