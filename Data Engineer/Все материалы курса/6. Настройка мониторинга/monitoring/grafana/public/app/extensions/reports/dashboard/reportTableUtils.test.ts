import { createTheme, FieldType, toDataFrame } from '@grafana/data';
import { SceneGridLayout, SceneGridRow, VizPanel } from '@grafana/scenes';
import { TableCellHeight } from '@grafana/schema';
import { DashboardGridItem } from 'app/features/dashboard-scene/scene/layout-default/DashboardGridItem';

import {
  calculateRowsPerPage,
  calculateTablePageInfo,
  getPanelChromeOverhead,
  getTablePanels,
  splitFrameIntoPages,
  TABLE_HEADER_HEIGHT,
} from './reportTableUtils';

const theme = createTheme();

describe('splitFrameIntoPages', () => {
  function makeFrame(rowCount: number) {
    return toDataFrame({
      fields: [
        { name: 'Time', type: FieldType.time, values: Array.from({ length: rowCount }, (_, i) => i * 1000) },
        {
          name: 'Value',
          type: FieldType.number,
          values: Array.from({ length: rowCount }, (_, i) => i),
          config: { unit: 'short' },
        },
      ],
    });
  }

  it('splits rows across pages and preserves field metadata', () => {
    const frame = makeFrame(25);
    const pages = splitFrameIntoPages(frame, 10, theme);

    expect(pages).toHaveLength(3);
    expect(pages[0].length).toBe(10);
    expect(pages[1].length).toBe(10);
    expect(pages[2].length).toBe(5);

    // Field config preserved on all pages
    for (const page of pages) {
      expect(page.fields[1].config).toEqual({ unit: 'short' });
    }

    // Values sliced correctly
    expect(pages[0].fields[1].values[0]).toBe(0);
    expect(pages[1].fields[1].values[0]).toBe(10);
    expect(pages[2].fields[1].values[0]).toBe(20);

    // Display processors attached
    for (const field of pages[0].fields) {
      expect(field.display).toBeDefined();
    }
  });

  it('does not modify the original frame', () => {
    const frame = makeFrame(5);
    const originalDisplay = frame.fields[0].display;
    splitFrameIntoPages(frame, 3, theme);
    expect(frame.fields[0].display).toBe(originalDisplay);
  });

  it('returns empty for zero-length frame', () => {
    expect(splitFrameIntoPages(makeFrame(0), 10, theme)).toEqual([]);
  });
});

describe('calculateRowsPerPage', () => {
  const overhead = getPanelChromeOverhead(theme);

  it('returns correct count and respects showHeader', () => {
    const rowHeight = 36;
    const withHeader = Math.floor((800 - overhead - TABLE_HEADER_HEIGHT) / rowHeight);
    const withoutHeader = Math.floor((800 - overhead) / rowHeight);

    expect(calculateRowsPerPage(800, rowHeight, overhead)).toBe(withHeader);
    expect(calculateRowsPerPage(800, rowHeight, overhead, false)).toBe(withoutHeader);
    expect(withoutHeader).toBeGreaterThan(withHeader);
  });

  it('returns at least 1 for very small page height', () => {
    expect(calculateRowsPerPage(50, 36, overhead)).toBe(1);
  });
});

describe('getTablePanels', () => {
  function buildGridItem(panel: VizPanel): DashboardGridItem {
    return new DashboardGridItem({ key: `gi-${panel.state.key}`, x: 0, y: 0, width: 24, height: 10, body: panel });
  }

  it('filters table panels from mixed types and extracts options + fieldConfig', () => {
    const tablePanel = new VizPanel({
      pluginId: 'table',
      title: 'My Table',
      key: 'p1',
      options: { cellHeight: TableCellHeight.Lg, showHeader: false, frameIndex: 2 },
      fieldConfig: { defaults: { noValue: 'N/A' }, overrides: [] },
    });

    const grid = new SceneGridLayout({
      children: [
        buildGridItem(tablePanel),
        buildGridItem(new VizPanel({ pluginId: 'timeseries', title: 'Chart', key: 'p2' })),
      ],
    });

    const tables = getTablePanels(grid);
    expect(tables).toHaveLength(1);
    expect(tables[0].panel.state.title).toBe('My Table');
    expect(tables[0].options.cellHeight).toBe(TableCellHeight.Lg);
    expect(tables[0].options.showHeader).toBe(false);
    expect(tables[0].options.frameIndex).toBe(2);
    expect(tables[0].fieldConfig.defaults.noValue).toBe('N/A');
  });

  it('finds table panels inside rows and includes repeated panels', () => {
    const body = new VizPanel({ pluginId: 'table', title: 'T', key: 'p1' });
    const clone = new VizPanel({ pluginId: 'table', title: 'T clone', key: 'p1c' });

    const grid = new SceneGridLayout({
      children: [
        new SceneGridRow({
          key: 'row-1',
          title: 'Row',
          y: 0,
          children: [
            new DashboardGridItem({
              key: 'gi-1',
              x: 0,
              y: 1,
              width: 24,
              height: 10,
              body,
              repeatedPanels: [clone],
              variableName: 'server',
            }),
          ],
        }),
      ],
    });

    const tables = getTablePanels(grid);
    expect(tables).toHaveLength(2);
    expect(tables[0].panel).toBe(body);
    expect(tables[1].panel).toBe(clone);
  });
});

describe('calculateTablePageInfo', () => {
  function mockTablePanel(key: string): {
    panel: VizPanel;
    options: { showHeader: boolean; frameIndex: number };
    fieldConfig: { defaults: {}; overrides: [] };
  } {
    return {
      panel: new VizPanel({ key, pluginId: 'table', title: key }),
      options: { showHeader: true, frameIndex: 0 },
      fieldConfig: { defaults: {}, overrides: [] },
    };
  }

  it('returns empty arrays for no tables', () => {
    const result = calculateTablePageInfo([], {});
    expect(result.tablePageOffsets).toEqual([]);
    expect(result.tableAppendixPages).toBe(0);
  });

  it('calculates cumulative offsets for multiple tables', () => {
    const tablePanels = [mockTablePanel('table-1'), mockTablePanel('table-2'), mockTablePanel('table-3')];
    const pageCounts = { 'table-1': 2, 'table-2': 3, 'table-3': 1 };

    const result = calculateTablePageInfo(tablePanels, pageCounts);

    // First table starts at offset 0
    // Second table starts after first (offset 2)
    // Third table starts after first two (offset 5)
    expect(result.tablePageOffsets).toEqual([0, 2, 5]);
    expect(result.tableAppendixPages).toBe(6);
  });

  it('handles tables with zero pages', () => {
    const tablePanels = [mockTablePanel('table-1'), mockTablePanel('table-2'), mockTablePanel('table-3')];
    const pageCounts = { 'table-1': 2, 'table-2': 0, 'table-3': 3 };

    const result = calculateTablePageInfo(tablePanels, pageCounts);

    expect(result.tablePageOffsets).toEqual([0, 2, 2]);
    expect(result.tableAppendixPages).toBe(5);
  });

  it('handles missing page counts (defaults to 0)', () => {
    const tablePanels = [mockTablePanel('table-1'), mockTablePanel('table-2')];
    const pageCounts = { 'table-1': 3 }; // table-2 not in map

    const result = calculateTablePageInfo(tablePanels, pageCounts);

    expect(result.tablePageOffsets).toEqual([0, 3]);
    expect(result.tableAppendixPages).toBe(3);
  });

  it('calculates correct page numbers for grid + appendix integration', () => {
    // Simulate: 2 grid pages + 3 tables with 2, 3, 1 pages respectively
    const gridPageCount = 2;
    const tablePanels = [mockTablePanel('t1'), mockTablePanel('t2'), mockTablePanel('t3')];
    const pageCounts = { t1: 2, t2: 3, t3: 1 };

    const { tablePageOffsets, tableAppendixPages } = calculateTablePageInfo(tablePanels, pageCounts);
    const totalPageCount = gridPageCount + tableAppendixPages;

    // Grid pages: 1, 2 (both show totalPageCount = 8)
    expect(totalPageCount).toBe(8);

    // Table 1: starts at page 3 (gridPageCount + offset[0] + 1 = 2 + 0 + 1)
    //   pages: 3, 4
    expect(gridPageCount + tablePageOffsets[0] + 1).toBe(3);

    // Table 2: starts at page 5 (gridPageCount + offset[1] + 1 = 2 + 2 + 1)
    //   pages: 5, 6, 7
    expect(gridPageCount + tablePageOffsets[1] + 1).toBe(5);

    // Table 3: starts at page 8 (gridPageCount + offset[2] + 1 = 2 + 5 + 1)
    //   pages: 8
    expect(gridPageCount + tablePageOffsets[2] + 1).toBe(8);

    // Last page number equals totalPageCount
    const lastTableLastPage = gridPageCount + tablePageOffsets[2] + pageCounts.t3;
    expect(lastTableLastPage).toBe(totalPageCount);
  });
});
