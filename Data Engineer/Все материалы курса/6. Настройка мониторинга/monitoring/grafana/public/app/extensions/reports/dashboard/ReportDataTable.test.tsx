import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom-v5-compat';
import { render } from 'test/test-utils';

import { FieldType, LoadingState, toDataFrame } from '@grafana/data';
import { SceneDataNode, SceneTimeRange, VizPanel } from '@grafana/scenes';
import { TableCellHeight } from '@grafana/schema';
import { type DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';

import { ReportDataTable, type ReportDataTableProps } from './ReportDataTable';

jest.mock('app/features/dashboard-scene/scene/layout-default/DashboardGridItemRenderer', () => ({
  DashboardGridItemRenderer: () => <div data-testid="mock-grid-item" />,
}));

jest.mock('@grafana/ui/unstable', () => ({
  ...jest.requireActual('@grafana/ui/unstable'),
  TableNG: ({
    data,
    width,
    height,
    noHeader,
    showTypeIcons,
    cellHeight,
    maxRowHeight,
    noValue,
    enableVirtualization,
    enablePagination,
  }: {
    data: { fields: Array<{ name: string }>; length: number };
    width: number;
    height: number;
    noHeader?: boolean;
    showTypeIcons?: boolean;
    cellHeight?: string;
    maxRowHeight?: number;
    noValue?: string;
    enableVirtualization?: boolean;
    enablePagination?: boolean;
  }) => (
    <div
      data-testid="table-ng"
      data-width={width}
      data-height={height}
      data-row-count={data.length}
      data-no-header={String(noHeader)}
      data-show-type-icons={String(showTypeIcons)}
      data-cell-height={cellHeight}
      data-max-row-height={maxRowHeight}
      data-no-value={noValue}
      data-enable-virtualization={String(enableVirtualization)}
      data-enable-pagination={String(enablePagination)}
    >
      {data.fields.map((f: { name: string }) => (
        <span key={f.name}>{f.name}</span>
      ))}
    </div>
  ),
}));

function buildDataNode(state: LoadingState, rows: number): SceneDataNode {
  return new SceneDataNode({
    data: {
      state,
      series: [
        toDataFrame({
          fields: [
            { name: 'Time', type: FieldType.time, values: Array.from({ length: rows }, (_, i) => i * 1000) },
            { name: 'Value', type: FieldType.number, values: Array.from({ length: rows }, (_, i) => i) },
          ],
        }),
      ],
      timeRange: {} as never,
    },
  });
}

function buildMultiFrameDataNode(frameCount: number): SceneDataNode {
  return new SceneDataNode({
    data: {
      state: LoadingState.Done,
      series: Array.from({ length: frameCount }, (_, i) =>
        toDataFrame({
          name: `frame-${i}`,
          fields: [{ name: `Frame${i}`, type: FieldType.number, values: [1, 2, 3] }],
        })
      ),
      timeRange: {} as never,
    },
  });
}

const mockDashboard = { title: 'Test Dashboard' } as unknown as DashboardScene;
const mockTimeRange = new SceneTimeRange();

const defaultProps: Omit<ReportDataTableProps, 'panel'> = {
  options: { cellHeight: TableCellHeight.Sm, showHeader: true, frameIndex: 0 },
  fieldConfig: { defaults: {}, overrides: [] },
  screenWidth: 762,
  screenHeight: 900,
  scaleFactor: 1,
  startPageNumber: 2,
  totalPageCount: 5,
  onPageCount: jest.fn(),
  headerProps: {
    reportTitle: 'Test Report',
    dashboardTitle: 'Test Dashboard',
    timeRange: mockTimeRange.state,
    scaleFactor: 1,
    dashboard: mockDashboard,
    showTemplateVariables: false,
    showHeader: true,
    showTimeRange: true,
    showDashboardTitle: true,
  },
};

function setup(panel: VizPanel, overrides: Partial<ReportDataTableProps> = {}) {
  const onPageCount = jest.fn();
  const props = { ...defaultProps, panel, onPageCount, ...overrides };

  render(
    <Routes>
      <Route path="/" element={<ReportDataTable {...props} />} />
    </Routes>,
    { historyOptions: { initialEntries: ['/'] } }
  );

  return { onPageCount };
}

describe('ReportDataTable', () => {
  it('renders nothing and reports 0 pages for loading/empty data', () => {
    const { onPageCount: loadingCb } = setup(
      new VizPanel({ title: 'Loading', pluginId: 'table', key: 'p1', $data: buildDataNode(LoadingState.Loading, 5) })
    );
    expect(screen.queryByTestId('table-ng')).not.toBeInTheDocument();
    expect(loadingCb).toHaveBeenCalledWith('p1', 0);

    const { onPageCount: emptyCb } = setup(
      new VizPanel({
        title: 'Empty',
        pluginId: 'table',
        key: 'p2',
        $data: new SceneDataNode({ data: { state: LoadingState.Done, series: [], timeRange: {} as never } }),
      })
    );
    expect(emptyCb).toHaveBeenCalledWith('p2', 0);
  });

  describe('frameIndex selection', () => {
    it.each([
      ['valid index 1 selects second frame', 1, 'Frame1'],
      ['out-of-range falls back to frame 0', 99, 'Frame0'],
      ['equal to length falls back to frame 0', 3, 'Frame0'],
      ['negative falls back to frame 0', -1, 'Frame0'],
    ])('%s', (_name, frameIndex, expectedField) => {
      setup(
        new VizPanel({
          title: 'Multi',
          pluginId: 'table',
          key: 'p1',
          $data: buildMultiFrameDataNode(3),
        }),
        { options: { cellHeight: TableCellHeight.Sm, showHeader: true, frameIndex } }
      );

      expect(screen.getByText(expectedField)).toBeInTheDocument();
    });
  });

  it('renders panel description and prefixes page title with appendix label', () => {
    setup(
      new VizPanel({
        title: 'Revenue',
        description: 'USD, excludes refunds',
        pluginId: 'table',
        key: 'p1',
        $data: buildDataNode(LoadingState.Done, 5),
      })
    );

    expect(screen.getAllByText('USD, excludes refunds').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Appendix - Test Dashboard - Revenue').length).toBeGreaterThan(0);
  });

  it('omits description node when panel has no description', () => {
    setup(new VizPanel({ title: 'NoDesc', pluginId: 'table', key: 'p1', $data: buildDataNode(LoadingState.Done, 5) }));

    expect(screen.getAllByText('Appendix - Test Dashboard - NoDesc').length).toBeGreaterThan(0);
  });

  it('forwards panel options and fieldConfig through to TableNG', () => {
    setup(
      new VizPanel({ title: 'Options', pluginId: 'table', key: 'p1', $data: buildDataNode(LoadingState.Done, 5) }),
      {
        options: {
          cellHeight: TableCellHeight.Lg,
          showHeader: false,
          showTypeIcons: true,
          maxRowHeight: 200,
          frameIndex: 0,
        },
        fieldConfig: { defaults: { noValue: '—' }, overrides: [] },
      }
    );

    const table = screen.getByTestId('table-ng');
    expect(table).toHaveAttribute('data-no-header', 'true');
    expect(table).toHaveAttribute('data-show-type-icons', 'true');
    expect(table).toHaveAttribute('data-cell-height', TableCellHeight.Lg);
    expect(table).toHaveAttribute('data-max-row-height', '200');
    expect(table).toHaveAttribute('data-no-value', '—');
    expect(table).toHaveAttribute('data-enable-virtualization', 'false');
    expect(table).toHaveAttribute('data-enable-pagination', 'false');
  });

  it('caps row count at MAX_APPENDIX_ROWS and renders a truncation notice', () => {
    const { onPageCount } = setup(
      new VizPanel({
        title: 'Huge',
        pluginId: 'table',
        key: 'p1',
        $data: buildDataNode(LoadingState.Done, 1500),
      })
    );

    const renderedTables = screen.getAllByTestId('table-ng');
    const totalRows = renderedTables.reduce((sum, el) => sum + Number(el.getAttribute('data-row-count')), 0);
    expect(totalRows).toBe(1000);
    expect(onPageCount).toHaveBeenCalledWith('p1', renderedTables.length);

    expect(screen.getAllByText('Showing first 1000 of 1500 rows').length).toBeGreaterThan(0);
  });

  it('does not render a truncation notice when row count is under the cap', () => {
    setup(new VizPanel({ title: 'Small', pluginId: 'table', key: 'p1', $data: buildDataNode(LoadingState.Done, 5) }));

    expect(screen.queryByText(/Showing first .* of .* rows/)).not.toBeInTheDocument();
  });

  it('renders paginated tables with correct page numbers and header title', () => {
    const startPageNumber = 4;
    const totalPageCount = 10;
    const { onPageCount } = setup(
      new VizPanel({ title: 'Big Table', pluginId: 'table', key: 'p1', $data: buildDataNode(LoadingState.Done, 50) }),
      { startPageNumber, totalPageCount }
    );

    const renderedTables = screen.getAllByTestId('table-ng');
    expect(renderedTables.length).toBeGreaterThan(0);
    expect(onPageCount).toHaveBeenCalledWith('p1', renderedTables.length);

    // Header shows "Appendix - Dashboard - Panel"
    expect(screen.getAllByText('Appendix - Test Dashboard - Big Table').length).toBeGreaterThanOrEqual(1);

    // Footer page numbers start at startPageNumber and are sequential
    const pageTexts = screen.getAllByText(/^Page \d+\/\d+$/).map((el) => el.textContent);
    for (let i = 0; i < renderedTables.length; i++) {
      expect(pageTexts).toContain(`Page ${startPageNumber + i}/${totalPageCount}`);
    }
  });
});
