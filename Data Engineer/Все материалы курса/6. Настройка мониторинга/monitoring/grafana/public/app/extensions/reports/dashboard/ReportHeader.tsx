import { css } from '@emotion/css';
import { forwardRef } from 'react';

import { dateTimeFormat, type GrafanaTheme2 } from '@grafana/data';
import { Trans, formatDate } from '@grafana/i18n';
import { type SceneObject, type SceneTimeRangeState } from '@grafana/scenes';
import { Stack, useTheme2 } from '@grafana/ui';
import { type DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { VariableControls } from 'app/features/dashboard-scene/scene/VariableControls';

export interface HeaderProps {
  reportTitle: string;
  dashboardTitle: string;
  timeRange: SceneTimeRangeState;
  scaleFactor: number;
  showTemplateVariables: boolean;
  showHeader: boolean;
  showTimeRange: boolean;
  showDashboardTitle: boolean;
  variableControls?: SceneObject[];
  dashboard: DashboardScene;
}

function getReadableDateTimes(timeRange: SceneTimeRangeState) {
  const dateDisplayFormat = 'YYYY-MM-DD HH:mm:ss Z';
  const dateFormatOpts = { timeZone: timeRange.timeZone, format: dateDisplayFormat };
  const displayFrom = dateTimeFormat(timeRange.value.from, dateFormatOpts);
  const displayTo = dateTimeFormat(timeRange.value.to, dateFormatOpts);

  return { displayFrom, displayTo };
}

const ReportHeader = forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      reportTitle,
      dashboardTitle,
      timeRange,
      scaleFactor,
      showTemplateVariables,
      showHeader,
      showTimeRange,
      showDashboardTitle,
      dashboard,
    },
    ref
  ) => {
    const theme = useTheme2();

    const styles = getStyles(theme, scaleFactor);
    const { displayFrom, displayTo } = getReadableDateTimes(timeRange);
    const generatedOnDate = formatDate(new Date(), {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    const hasContent = showHeader || showTimeRange || showDashboardTitle || showTemplateVariables;

    return (
      <div ref={ref} className={hasContent ? styles.header : undefined}>
        {(showHeader || showTimeRange) && (
          <div className={styles.subHeader}>
            {showHeader && (
              <div>
                <Trans i18nKey="report.report-header.title">
                  {{ reportTitle }} - Generated on {{ generatedOnDate }}
                </Trans>
              </div>
            )}
            {showTimeRange && (
              <div className={styles.timeRangeBlock}>
                <div>
                  <Trans i18nKey="report.report-header.time-range">Data time range:</Trans> {displayFrom}
                  <br />
                  {displayTo}
                </div>
              </div>
            )}
          </div>
        )}
        {showDashboardTitle && (
          <>
            <div className={styles.dashboardTitle}>{dashboardTitle}</div>
            <hr className={styles.divider} />
          </>
        )}
        {showTemplateVariables && (
          <div className={styles.subHeader}>
            <Stack grow={1} wrap={'wrap'}>
              <VariableControls dashboard={dashboard} />
            </Stack>
          </div>
        )}
      </div>
    );
  }
);

function getStyles(theme: GrafanaTheme2, scaleFactor: number) {
  return {
    subHeader: css({
      label: 'subheader',
      display: 'flex',
      fontWeight: theme.typography.fontWeightMedium,
      // TODO: We should use value from theme
      fontSize: `${0.85 * scaleFactor}rem`,
      paddingTop: theme.spacing(2 * scaleFactor),
    }),
    timeRangeBlock: css({
      label: 'time-range-block',
      display: 'flex',
      justifyContent: 'flex-end',
      textAlign: 'right',
      flexGrow: 1,
    }),
    dashboardTitle: css({
      label: 'dashboard-title',
      // TODO: We should use value from theme
      fontSize: `${1.7 * scaleFactor}rem`,
      fontWeight: theme.typography.fontWeightMedium,
    }),
    divider: css({
      marginTop: 0,
      marginBottom: 0,
    }),
    header: css({
      paddingBottom: theme.spacing(2 * scaleFactor),
    }),
  };
}

ReportHeader.displayName = 'ReportHeader';

export default ReportHeader;
