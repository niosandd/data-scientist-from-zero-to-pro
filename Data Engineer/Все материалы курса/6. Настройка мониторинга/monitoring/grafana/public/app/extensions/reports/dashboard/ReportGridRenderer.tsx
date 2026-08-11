import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { type GrafanaTheme2 } from '@grafana/data';
import {
  sceneGraph,
  type SceneGridItemLike,
  type SceneGridLayout,
  SceneGridRow,
  type SceneTimeRangeState,
} from '@grafana/scenes';
import { useTheme2 } from '@grafana/ui';
import { GRID_COLUMN_COUNT } from 'app/core/constants';
import { type DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { DashboardGridItem } from 'app/features/dashboard-scene/scene/layout-default/DashboardGridItem';
import { activateSceneObjectAndParentTree } from 'app/features/dashboard-scene/utils/utils';

import {
  DATE_FORMAT_OPTIONS,
  FOOTER_ITEM_TYPES,
  type FooterItem,
  type FooterItemType,
  MAX_FIXED_TEXT_LENGTH,
  MAX_FOOTER_ITEMS,
} from '../../types';

import { ReportDataTable } from './ReportDataTable';
import ReportFooter from './ReportFooter';
import ReportHeader, { type HeaderProps } from './ReportHeader';
import { calculateTablePageInfo, getTablePanels } from './reportTableUtils';
import {
  buildGridLayout,
  buildSimpleLayout,
  calcGridItemPosition,
  getGridParams,
  type PositionParams,
  type ReportGridItem,
  type ReportPage,
} from './utils';

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1122;
export const DEFAULT_FOOTER_HEIGHT = 40;
const SIDE_MARGIN = 16;

interface Props {
  grid: SceneGridLayout;
  dashboardTitle: string;
  timeRange: SceneTimeRangeState;
  dashboard: DashboardScene;
}

export function ReportGridRenderer({ grid, dashboardTitle, timeRange, dashboard }: Props) {
  const [isActive, setIsActive] = useState(false);
  const {
    scaleFactor,
    isLandscape,
    isSimpleLayout,
    reportTitle,
    showTemplateVariables,
    showHeader,
    showTimeRange,
    showDashboardTitle,
    footerItems,
    footerFontFamily,
    pdfTables,
  } = useUrlValues();
  const theme = useTheme2();
  const styles = getStyles(theme, scaleFactor);

  uncollapseRows(grid.state.children);
  const { children } = grid.useState();

  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const observedHeaderDiv = useRef<HTMLDivElement | null>(null);
  useResizeObserver({
    ref: observedHeaderDiv,
    onResize: () => {
      const element = observedHeaderDiv.current;
      if (element && element.offsetHeight !== 0) {
        setHeaderHeight(element.offsetHeight);
      }
    },
  });

  const [footerHeight, setFooterHeight] = useState<number>(DEFAULT_FOOTER_HEIGHT);
  const observedFooterDiv = useRef<HTMLDivElement | null>(null);
  useResizeObserver({
    ref: observedFooterDiv,
    onResize: () => {
      const element = observedFooterDiv.current;
      if (element && element.offsetHeight !== 0) {
        setFooterHeight(element.offsetHeight);
      }
    },
  });

  const [tablePageCounts, setTablePageCounts] = useState<Record<string, number>>({});

  const handleTablePageCount = useCallback((panelKey: string, count: number) => {
    setTablePageCounts((prev) => (prev[panelKey] === count ? prev : { ...prev, [panelKey]: count }));
  }, []);

  const tablePanels = pdfTables ? getTablePanels(grid) : [];
  const { tablePageOffsets, tableAppendixPages } = calculateTablePageInfo(tablePanels, tablePageCounts);

  const headerProps: HeaderProps = {
    reportTitle: reportTitle || dashboardTitle,
    dashboardTitle,
    timeRange,
    scaleFactor,
    dashboard,
    showTemplateVariables,
    showHeader,
    showTimeRange,
    showDashboardTitle,
  };

  useEffect(() => {
    setIsActive(true);
    sceneGraph.findDescendents(grid, DashboardGridItem).forEach((gridItem) => {
      if (!gridItem.isActive) {
        activateSceneObjectAndParentTree(gridItem);
      }
    });

    return activateSceneObjectAndParentTree(grid);
  }, [grid]);

  if (!isActive) {
    return null;
  }

  let pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
  let pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;

  const screenWidth = pageWidth * scaleFactor - 2 * SIDE_MARGIN;
  const screenHeight = pageHeight * scaleFactor - footerHeight - headerHeight;

  // this object can't be memoized because there are some references inside children that are being updated
  // when using repeating panels
  let blocks: ReportPage[] = [];
  if (isSimpleLayout) {
    blocks = buildSimpleLayout(children, scaleFactor, screenHeight, isLandscape);
  } else {
    blocks = buildGridLayout(children, scaleFactor, screenHeight);
  }

  const gridPageCount = blocks.length;
  const totalPageCount = gridPageCount + tableAppendixPages;

  return (
    <div>
      {/*This hidden ReportHeader is used to dynamically measure the height and then build the grid using that value*/}
      <div style={{ width: screenWidth, visibility: 'hidden', position: 'absolute', top: 0, left: 0 }}>
        <ReportHeader {...headerProps} ref={observedHeaderDiv} />
      </div>
      <div
        style={{ width: screenWidth, visibility: 'hidden', position: 'absolute', top: 0, left: 0 }}
        aria-hidden="true"
      >
        <div ref={observedFooterDiv}>
          <ReportFooter
            scaleFactor={scaleFactor}
            currentPage={1}
            totalPageCount={1}
            footerItems={footerItems}
            footerFontFamily={footerFontFamily}
          />
        </div>
      </div>
      <>
        {blocks.map((page, index) => {
          const isLastGridPage = index === blocks.length - 1;
          const hasPageBreak = page.pageBreakAfter || (isLastGridPage && tableAppendixPages > 0);

          return (
            <div key={index} className={styles.page}>
              <div className={styles.content}>
                <ReportHeader {...headerProps} />
                <div style={getPageStyle(page, screenWidth)}>
                  {page.items.map((item, itemIndex) => (
                    <div key={itemIndex} style={getItemStyle(item, screenWidth)}>
                      {item.render()}
                    </div>
                  ))}
                </div>
              </div>
              <ReportFooter
                scaleFactor={scaleFactor}
                currentPage={index + 1}
                totalPageCount={totalPageCount}
                footerItems={footerItems}
                footerFontFamily={footerFontFamily}
              />
              {hasPageBreak && <div style={{ pageBreakAfter: 'always' }} />}
            </div>
          );
        })}
      </>
      {tablePanels.map((info, idx) => (
        <ReportDataTable
          key={info.panel.state.key}
          panel={info.panel}
          options={info.options}
          fieldConfig={info.fieldConfig}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          scaleFactor={scaleFactor}
          startPageNumber={gridPageCount + tablePageOffsets[idx] + 1}
          totalPageCount={totalPageCount}
          onPageCount={handleTablePageCount}
          headerProps={headerProps}
          footerItems={footerItems}
          footerFontFamily={footerFontFamily}
        />
      ))}
    </div>
  );
}

const validFooterItemTypes = new Set<FooterItemType>(FOOTER_ITEM_TYPES);
const validDateFormats = new Set<string>(DATE_FORMAT_OPTIONS);
const validFontWeights = new Set(['normal', 'bold']);
const validFontStyles = new Set(['normal', 'italic']);
const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeFloat(value: unknown, min: number, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const n = parseFloat(value);
  if (isNaN(n) || !isFinite(n) || n < min || n > max) {
    return undefined;
  }
  return String(n);
}

export function parseFooterItems(raw: string | null): FooterItem[] | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const optStr = (value: unknown) => (typeof value === 'string' ? value : undefined);

    return parsed
      .slice(0, MAX_FOOTER_ITEMS)
      .filter(
        (item: Record<string, unknown>) =>
          typeof item?.type === 'string' && validFooterItemTypes.has(item.type as FooterItemType)
      )
      .map((item: Record<string, unknown>): FooterItem => {
        const type = item.type as FooterItemType;
        const value = optStr(item.value);
        const color = optStr(item.color);
        return {
          type,
          value:
            type === 'date'
              ? value && validDateFormats.has(value)
                ? value
                : undefined
              : type === 'logo'
                ? safeFloat(item.value, 8, 128)
                : type === 'fixedText'
                  ? value?.slice(0, MAX_FIXED_TEXT_LENGTH)
                  : undefined,
          fontSize: safeFloat(item.fontSize, 6, 72),
          fontWeight: validFontWeights.has(String(item.fontWeight))
            ? (String(item.fontWeight) as FooterItem['fontWeight'])
            : undefined,
          fontStyle: validFontStyles.has(String(item.fontStyle))
            ? (String(item.fontStyle) as FooterItem['fontStyle'])
            : undefined,
          color: color && hexColorPattern.test(color) ? color : undefined,
        };
      });
  } catch {
    return undefined;
  }
}

export function useUrlValues() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const scaleFactor = parseFloat(urlParams.get('scale') ?? '');

  return {
    scaleFactor: isNaN(scaleFactor) ? 1 : scaleFactor,
    isLandscape: urlParams.get('pdf.landscape') !== 'false',
    isSimpleLayout: urlParams.get('pdf.layout') === 'simple',
    reportTitle: urlParams.get('title'),
    showTemplateVariables:
      urlParams.get('pdf.showTemplateVariables') !== null && urlParams.get('pdf.showTemplateVariables') !== 'false',
    showHeader: urlParams.get('pdf.header') !== 'false',
    showTimeRange: urlParams.get('pdf.timeRange') !== 'false',
    showDashboardTitle: urlParams.get('pdf.dashboardTitle') !== 'false',
    footerItems: parseFooterItems(urlParams.get('pdf.footerItems')),
    footerFontFamily: urlParams.get('pdf.footerFontFamily') ?? undefined,
    pdfTables: urlParams.get('pdf.tables') === 'true',
  };
}

function uncollapseRows(children: SceneGridItemLike[]) {
  for (const gridChild of children) {
    if (gridChild instanceof SceneGridRow && gridChild.state.isCollapsed) {
      gridChild.onCollapseToggle();
    }
  }
}

function getItemStyle(item: ReportGridItem, screenWidth: number): React.CSSProperties {
  const params: PositionParams = getGridParams(screenWidth);
  const position = calcGridItemPosition(params, item.x, item.y, item.w, item.h);

  return {
    top: position.top,
    left: position.left,
    width: position.width,
    height: position.height,
    position: 'absolute',
  };
}

function getPageStyle(block: ReportPage, screenWidth: number): React.CSSProperties {
  const params: PositionParams = getGridParams(screenWidth);
  const position = calcGridItemPosition(params, 0, 0, GRID_COLUMN_COUNT, block.h);

  return {
    width: position.width,
    height: position.height,
    position: 'relative',
  };
}

function getStyles(theme: GrafanaTheme2, scaleFactor: number) {
  return {
    page: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      minHeight: '100vh',
      // this is needed to avoid printing an extra empty page in the end
      '&:last-of-type': {
        marginBottom: theme.spacing(2 * -1),
      },
      padding: '0 ' + theme.spacing(2 * scaleFactor),
    }),
    content: css({
      flex: 1,
    }),
  };
}
