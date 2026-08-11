// Libraries
import saveAs from 'file-saver';
import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom-v5-compat';

import { type DataFrame, dateTimeFormat, LoadingState, type PanelData, toCSV } from '@grafana/data';
import { t } from '@grafana/i18n';
import { sceneGraph, UrlSyncContextProvider, type VizPanel } from '@grafana/scenes';
import { Alert, Box } from '@grafana/ui';
import PageLoader from 'app/core/components/PageLoader/PageLoader';
import { EntityNotFound } from 'app/core/components/PageNotFound/EntityNotFound';
import { type GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { type DashboardPageRouteParams } from 'app/features/dashboard/containers/types';
import { getDashboardScenePageStateManager } from 'app/features/dashboard-scene/pages/DashboardScenePageStateManager';
import { SoloPanelContext } from 'app/features/dashboard-scene/solo/SoloPanelContext';
import { SoloPanelRenderer } from 'app/features/dashboard-scene/solo/SoloPanelPage';
import { DashboardRoutes } from 'app/types/dashboard';

import { type CSVEncoding } from '../types';

export interface Props extends GrafanaRouteComponentProps<
  DashboardPageRouteParams,
  { panelId?: string; timezone?: string; csvEncoding?: CSVEncoding }
> {}

export function CSVExportPageScene({ queryParams }: Props) {
  const stateManager = getDashboardScenePageStateManager('v1');
  const { dashboard, loadError } = stateManager.useState();
  const { uid = '', type, slug } = useParams();

  useEffect(() => {
    stateManager.loadDashboard({ uid, type, slug, route: DashboardRoutes.Embedded });
    return () => stateManager.clearState();
  }, [stateManager, queryParams, uid, type, slug]);

  if (!queryParams.panelId) {
    return <EntityNotFound entity="Panel" />;
  }

  if (loadError) {
    return (
      <Box justifyContent={'center'} alignItems={'center'} display={'flex'} height={'100%'}>
        <Alert severity="error" title={t('dashboard.errors.failed-to-load', 'Failed to load dashboard')}>
          {loadError.message}
        </Alert>
      </Box>
    );
  }

  if (!dashboard) {
    return <PageLoader />;
  }

  return (
    <UrlSyncContextProvider scene={dashboard}>
      <SoloPanelRenderer dashboard={dashboard} panelId={queryParams.panelId}>
        <DownloadCSV queryParams={queryParams} />
      </SoloPanelRenderer>
    </UrlSyncContextProvider>
  );
}

export default CSVExportPageScene;

export function DownloadCSV({
  queryParams,
}: {
  queryParams: { panelId?: string; timezone?: string; csvEncoding?: CSVEncoding };
}) {
  const [matchFound, setState] = useState(false);
  const hasExportedCsvRef = useRef(false);
  const soloContext = useContext(SoloPanelContext);

  useEffect(() => {
    if (matchFound) {
      return;
    }

    const cancelTimeout = setInterval(() => {
      setState(!!soloContext?.matchFound);
    }, 500);

    return () => clearInterval(cancelTimeout);
  }, [matchFound, soloContext]);

  useEffect(() => {
    if (!matchFound) {
      return;
    }

    const matchedPanel = soloContext?.matchedPanels?.[0];
    if (!matchedPanel) {
      return;
    }

    const dataProvider = sceneGraph.getData(matchedPanel);

    const currentData = dataProvider.state.data;
    if (currentData && currentData.state === LoadingState.Done && !hasExportedCsvRef.current) {
      hasExportedCsvRef.current = true;
      exportToCsv(currentData, matchedPanel, queryParams.csvEncoding);
      return;
    }

    const sub = dataProvider.subscribeToState((newState) => {
      if (hasExportedCsvRef.current) {
        return;
      }

      const panelData = newState.data;
      if (!panelData || panelData.state !== LoadingState.Done) {
        return;
      }
      hasExportedCsvRef.current = true;
      exportToCsv(panelData, matchedPanel, queryParams.csvEncoding);
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [matchFound, queryParams, soloContext]);

  return null;
}

function exportToCsv(panelData: PanelData, panel: VizPanel, csvEncoding: CSVEncoding | undefined) {
  const data = panel.applyFieldConfig(panelData);
  const dataFrames = data.series;

  if (dataFrames.length === 0) {
    return;
  }

  const blob = createCSVBlob(dataFrames, csvEncoding);
  const title = sceneGraph.interpolate(panel, panel.state.title) || 'panel';
  const fileName = `${title}-data-${dateTimeFormat(new Date())}.csv`;
  saveAs(blob, fileName);
}

function createCSVBlob(dataFrames: DataFrame[], csvEncoding: CSVEncoding | undefined) {
  let blob;
  if (!csvEncoding || csvEncoding === 'utf-8-bom') {
    // Keep legacy encoding support
    const dataFrameCsv = toCSV([dataFrames[0]], {});
    blob = new Blob([String.fromCharCode(0xfeff), dataFrameCsv], { type: 'text/csv;charset=utf-8' });
  } else {
    // Support same options as found in public/app/features/inspector/utils/download.ts @ downloadDataFrameAsCsv
    if (csvEncoding === 'utf-16le') {
      const dataFrameCsv = toCSV([dataFrames[0]], { useExcelHeader: false, delimiter: '\t' });
      const utf16le = new Uint16Array(Array.from('\ufeff' + dataFrameCsv).map((char) => char.charCodeAt(0)));
      blob = new Blob([utf16le], { type: 'text/csv;charset=utf-16le' });
    } else {
      const dataFrameCsv = toCSV([dataFrames[0]], {});
      blob = new Blob([dataFrameCsv], { type: 'text/csv;charset=utf-8' });
    }
  }

  return blob;
}
