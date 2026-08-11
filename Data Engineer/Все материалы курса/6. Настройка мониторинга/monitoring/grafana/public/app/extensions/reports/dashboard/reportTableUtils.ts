import { type DataFrame, type FieldConfigSource, type GrafanaTheme2, getDisplayProcessor } from '@grafana/data';
import { sceneGraph, type SceneGridLayout, type VizPanel } from '@grafana/scenes';
import { TableCellHeight } from '@grafana/schema';
import { PANEL_BORDER } from 'app/core/constants';
import { DashboardGridItem } from 'app/features/dashboard-scene/scene/layout-default/DashboardGridItem';

// Not publicly exported from @grafana/ui, so we duplicate them here.
// Source: packages/grafana-ui/src/components/Table/TableNG/constants.ts
export const TABLE_HEADER_HEIGHT = 34;
const TABLE_CELL_PADDING = 6;

/**
 * Hard cap on rows rendered per table in the PDF appendix. Without this cap,
 * `enableVirtualization={false}` would produce one DOM node per row in the
 * headless image renderer, risking OOM for very large tables. Beyond a few
 * hundred rows a PDF appendix isn't a practical reading format anyway — users
 * wanting a full export should rely on the CSV attachment instead.
 */
export const MAX_APPENDIX_ROWS = 1000;

/** Options extracted from the table panel's VizPanel state. */
export interface TablePanelOptions {
  cellHeight?: TableCellHeight;
  showHeader: boolean;
  showTypeIcons?: boolean;
  maxRowHeight?: number;
  frameIndex: number;
}

export interface TablePanelInfo {
  panel: VizPanel;
  options: TablePanelOptions;
  fieldConfig: FieldConfigSource;
}

/**
 * Compute the pixel overhead that PanelChrome adds around its content
 * (header bar + inner padding + border).
 */
export function getPanelChromeOverhead(theme: GrafanaTheme2): number {
  const headerHeight = theme.spacing.gridSize * theme.components.panel.headerHeight;
  const padding = theme.components.panel.padding * theme.spacing.gridSize * 2;
  return headerHeight + padding + PANEL_BORDER;
}

/**
 * Reserve vertical space for the panel description block above PanelChrome.
 * Returns 0 when the description is empty; otherwise derives the reservation
 * from theme typography (so it tracks font-size changes) times `lines`.
 */
export function getDescriptionOverhead(theme: GrafanaTheme2, description: string | undefined, lines = 1): number {
  if (!description) {
    return 0;
  }

  const lineHeightPx = theme.typography.fontSize * theme.typography.body.lineHeight;
  const topPadding = theme.spacing.gridSize;
  return Math.ceil(lineHeightPx * lines + topPadding);
}

/**
 * Map a TableCellHeight setting to its pixel row height, matching the logic
 * in getDefaultRowHeight from TableNG/utils.ts.
 *
 * For `Auto` (dynamic height), we fall back to `Md` since we need a fixed
 * number for page-splitting arithmetic.
 */
export function getRowHeight(theme: GrafanaTheme2, cellHeight?: TableCellHeight): number {
  switch (cellHeight) {
    case TableCellHeight.Sm:
      return 36;
    case TableCellHeight.Md:
      return 42;
    case TableCellHeight.Lg:
      return 48;
    case TableCellHeight.Auto:
      // Auto uses dynamic row heights which can't be predicted statically.
      // Fall back to Md for page-splitting calculations.
      return 42;
    default:
      // When cellHeight is undefined, getDefaultRowHeight uses theme-derived values
      return TABLE_CELL_PADDING * 2 + theme.typography.fontSize * theme.typography.body.lineHeight;
  }
}

/**
 * Calculate how many data rows fit on one report page.
 */
export function calculateRowsPerPage(
  pageContentHeight: number,
  rowHeight: number,
  panelChromeOverhead: number,
  showHeader = true
): number {
  const headerHeight = showHeader ? TABLE_HEADER_HEIGHT : 0;
  const available = pageContentHeight - panelChromeOverhead - headerHeight;
  return Math.max(1, Math.floor(available / rowHeight));
}

/**
 * Split a DataFrame into page-sized chunks, attaching display processors
 * to field copies so TableNG can render formatted values.
 */
export function splitFrameIntoPages(frame: DataFrame, rowsPerPage: number, theme: GrafanaTheme2): DataFrame[] {
  if (frame.length === 0) {
    return [];
  }

  // Attach display processors to field copies (not mutating originals)
  const fieldsWithDisplay = frame.fields.map((field) => ({
    ...field,
    display: field.display ?? getDisplayProcessor({ field, theme }),
  }));

  const pages: DataFrame[] = [];
  for (let start = 0; start < frame.length; start += rowsPerPage) {
    const end = Math.min(start + rowsPerPage, frame.length);
    pages.push({
      ...frame,
      length: end - start,
      fields: fieldsWithDisplay.map((field) => ({
        ...field,
        values: field.values.slice(start, end),
        nanos: field.nanos?.slice(start, end),
      })),
    });
  }

  return pages;
}

/**
 * Extract table panel options from a VizPanel's state, with defaults matching
 * the table panel plugin (see public/app/plugins/panel/table/panelcfg.gen.ts).
 */
function extractTableOptions(panel: VizPanel): TablePanelOptions {
  const opts = panel.state.options as Record<string, unknown> | undefined;
  return {
    cellHeight: opts?.cellHeight as TableCellHeight | undefined,
    showHeader: (opts?.showHeader as boolean) ?? true,
    showTypeIcons: opts?.showTypeIcons as boolean | undefined,
    maxRowHeight: opts?.maxRowHeight as number | undefined,
    frameIndex: (opts?.frameIndex as number) ?? 0,
  };
}

/**
 * Collect all table-type VizPanels from a grid layout, including repeated panels.
 */
export function getTablePanels(grid: SceneGridLayout): TablePanelInfo[] {
  const tables: TablePanelInfo[] = [];

  for (const gridItem of sceneGraph.findDescendents(grid, DashboardGridItem)) {
    const panels = [gridItem.state.body, ...(gridItem.state.repeatedPanels ?? [])];
    for (const panel of panels) {
      if (panel.state.pluginId === 'table' && panel.state.key) {
        tables.push({
          panel,
          options: extractTableOptions(panel),
          fieldConfig: panel.state.fieldConfig,
        });
      }
    }
  }

  return tables;
}

export interface TablePageInfo {
  /** Cumulative page offsets for each table (0-indexed within the appendix section). */
  tablePageOffsets: number[];
  /** Total number of appendix pages across all tables. */
  tableAppendixPages: number;
}

/**
 * Calculate page offsets for table panels in a PDF report.
 *
 * Given table panel info and their individual page counts,
 * computes cumulative offsets so each table's pages are numbered correctly
 * relative to preceding tables.
 */
export function calculateTablePageInfo(
  tablePanels: TablePanelInfo[],
  pageCounts: Record<string, number>
): TablePageInfo {
  const tablePageOffsets: number[] = [];
  let tableAppendixPages = 0;

  for (const info of tablePanels) {
    tablePageOffsets.push(tableAppendixPages);
    tableAppendixPages += pageCounts[info.panel.state.key ?? ''] ?? 0;
  }

  return { tablePageOffsets, tableAppendixPages };
}
