import { css } from '@emotion/css';
import { useEffect, useMemo } from 'react';

import { EventBusSrv, type FieldConfigSource, type GrafanaTheme2, LoadingState } from '@grafana/data';
import { t } from '@grafana/i18n';
import { sceneGraph, type VizPanel } from '@grafana/scenes';
import { PanelChrome, PanelContextProvider, useStyles2, useTheme2 } from '@grafana/ui';
import { TableNG } from '@grafana/ui/unstable';

import { type FooterItem } from '../../types';

import ReportFooter from './ReportFooter';
import ReportHeader, { type HeaderProps } from './ReportHeader';
import {
  calculateRowsPerPage,
  getDescriptionOverhead,
  getPanelChromeOverhead,
  getRowHeight,
  MAX_APPENDIX_ROWS,
  splitFrameIntoPages,
  TABLE_HEADER_HEIGHT,
  type TablePanelOptions,
} from './reportTableUtils';

export interface ReportDataTableProps {
  panel: VizPanel;
  options: TablePanelOptions;
  fieldConfig: FieldConfigSource;
  screenWidth: number;
  screenHeight: number;
  scaleFactor: number;
  startPageNumber: number;
  totalPageCount: number;
  /**
   * Must be referentially stable (e.g. wrapped in `useCallback`). This callback
   * is a dependency of a `useEffect` inside the component; an unstable identity
   * would cause the effect to re-run on every render.
   */
  onPageCount: (panelKey: string, count: number) => void;
  headerProps: HeaderProps;
  footerItems?: FooterItem[];
  footerFontFamily?: string;
}

export function ReportDataTable({
  panel,
  options,
  fieldConfig,
  screenWidth,
  screenHeight,
  scaleFactor,
  startPageNumber,
  totalPageCount,
  onPageCount,
  headerProps,
  footerItems,
  footerFontFamily,
}: ReportDataTableProps) {
  const dataProvider = sceneGraph.getData(panel);
  const { data } = dataProvider.useState();
  const theme = useTheme2();

  const panelContext = useMemo(
    () => ({
      eventsScope: 'report',
      eventBus: new EventBusSrv(),
    }),
    []
  );

  const chromeOverhead = getPanelChromeOverhead(theme);
  const descriptionOverhead = getDescriptionOverhead(theme, panel.state.description);
  const pageContentHeight = screenHeight - descriptionOverhead;
  const rowHeight = getRowHeight(theme, options.cellHeight);
  const rowsPerPage = calculateRowsPerPage(pageContentHeight, rowHeight, chromeOverhead, options.showHeader);

  const { pageChunks, totalRowCount } = useMemo(() => {
    if (!data || data.state !== LoadingState.Done || data.series.length === 0) {
      return { pageChunks: [], totalRowCount: 0 };
    }

    // Respect frameIndex — only render the frame the panel is configured to show
    const frameIndex = options.frameIndex > 0 && options.frameIndex < data.series.length ? options.frameIndex : 0;
    const frame = data.series[frameIndex];

    const cappedFrame =
      frame.length > MAX_APPENDIX_ROWS
        ? {
            ...frame,
            length: MAX_APPENDIX_ROWS,
            fields: frame.fields.map((field) => ({
              ...field,
              values: field.values.slice(0, MAX_APPENDIX_ROWS),
              nanos: field.nanos?.slice(0, MAX_APPENDIX_ROWS),
            })),
          }
        : frame;

    return {
      pageChunks: splitFrameIntoPages(cappedFrame, rowsPerPage, theme),
      totalRowCount: frame.length,
    };
  }, [data, options.frameIndex, rowsPerPage, theme]);

  const isTruncated = totalRowCount > MAX_APPENDIX_ROWS;

  const panelKey = panel.state.key;

  useEffect(() => {
    if (panelKey) {
      onPageCount(panelKey, pageChunks.length);
    }
  }, [panelKey, pageChunks.length, onPageCount]);

  const pageStyles = useStyles2((theme) => getStyles(theme, scaleFactor));

  const panelTitle = panel.state.title || '';
  const panelDescription = panel.state.description || '';
  const appendixLabel = t('reporting.pdf-tables.appendix', 'Appendix');
  const pageDashboardTitle = panelTitle
    ? `${appendixLabel} - ${headerProps.dashboardTitle} - ${panelTitle}`
    : `${appendixLabel} - ${headerProps.dashboardTitle}`;
  const tableHeaderHeight = options.showHeader ? TABLE_HEADER_HEIGHT : 0;

  if (!panelKey || pageChunks.length === 0) {
    return null;
  }

  return (
    <PanelContextProvider value={panelContext}>
      {pageChunks.map((frame, pageIndex) => {
        const tableHeight = tableHeaderHeight + frame.length * rowHeight;
        const panelHeight = tableHeight + chromeOverhead;
        const isLastPage = pageIndex === pageChunks.length - 1;

        return (
          <div key={pageIndex} className={pageStyles.page}>
            <div className={pageStyles.content}>
              <ReportHeader {...headerProps} dashboardTitle={pageDashboardTitle} />
              {panelDescription && <div className={pageStyles.description}>{panelDescription}</div>}
              {isTruncated && (
                <div className={pageStyles.truncationNotice}>
                  {t('reporting.pdf-tables.truncation-notice', 'Showing first {{cap}} of {{total}} rows', {
                    cap: MAX_APPENDIX_ROWS,
                    total: totalRowCount,
                  })}
                </div>
              )}
              <div className={pageStyles.tableContainer}>
                <PanelChrome title={panelTitle} width={screenWidth} height={panelHeight}>
                  {(innerWidth, innerHeight) => (
                    <TableNG
                      data={frame}
                      width={innerWidth}
                      height={innerHeight}
                      enableVirtualization={false}
                      enablePagination={false}
                      noHeader={!options.showHeader}
                      showTypeIcons={options.showTypeIcons}
                      cellHeight={options.cellHeight}
                      maxRowHeight={options.maxRowHeight}
                      fieldConfig={fieldConfig}
                      noValue={fieldConfig.defaults.noValue}
                    />
                  )}
                </PanelChrome>
              </div>
            </div>
            <ReportFooter
              scaleFactor={scaleFactor}
              currentPage={startPageNumber + pageIndex}
              totalPageCount={totalPageCount}
              footerItems={footerItems}
              footerFontFamily={footerFontFamily}
            />
            {!isLastPage && <div style={{ pageBreakAfter: 'always' }} />}
          </div>
        );
      })}
    </PanelContextProvider>
  );
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
      padding: '0 ' + theme.spacing(2 * scaleFactor),
    }),
    content: css({
      flex: 1,
    }),
    tableContainer: css({
      padding: '8px 0',
    }),
    description: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.typography.bodySmall.lineHeight,
      fontStyle: 'italic',
      padding: theme.spacing(1, 0, 0),
      whiteSpace: 'pre-wrap',
    }),
    truncationNotice: css({
      color: theme.colors.warning.text,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.typography.bodySmall.lineHeight,
      padding: theme.spacing(1, 0, 0),
    }),
  };
}
