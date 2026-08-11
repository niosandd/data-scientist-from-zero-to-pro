import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import {
  CoreApp,
  type DataSourceInstanceSettings,
  getDefaultRelativeTimeRange,
  getNextRefId,
  rangeUtil,
  LoadingState,
  type PanelData,
  getDefaultTimeRange,
} from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import { getDataSourceSrv } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { Button, Stack, Text, Box, Alert } from '@grafana/ui';
import { VizWrapper } from 'app/features/alerting/unified/components/rule-editor/VizWrapper';
import { useAlertQueryRunner } from 'app/features/alerting/unified/components/rule-editor/query-and-alert-condition/useAlertQueryRunner';
import { getDefaultOrFirstCompatibleDataSource } from 'app/features/alerting/unified/utils/datasource';
import { QueryEditorRow } from 'app/features/query/components/QueryEditorRow';
import { type AlertQuery } from 'app/types/unified-alerting-dto';

import { type AlertEnrichmentFormData } from './form';

interface EnricherConfigProps {
  stepPath: `steps.${number}`;
  isReadOnly?: boolean;
}

export function QueryEnricherConfig({ stepPath, isReadOnly = false }: EnricherConfigProps) {
  const { setValue, control } = useFormContext<AlertEnrichmentFormData>();

  const watchedQueries = useWatch({ control, name: `${stepPath}.enricher.dataSource.raw.request.queries` });

  // Memoize queries to prevent unnecessary re-renders
  const queries = useMemo(() => watchedQueries || [], [watchedQueries]);

  const { queryPreviewData, runQueries } = useAlertQueryRunner();

  /** Update queries with the raw dataSource type. */
  const updateQueriesWithRawType = useCallback(
    (updatedQueries: DataQuery[]) => {
      setValue(`${stepPath}.enricher.dataSource`, {
        type: 'raw',
        raw: {
          request: { queries: updatedQueries },
          refId: 'A',
        },
      });
    },
    [stepPath, setValue]
  );

  /**
   * Convert DataQuery to AlertQuery format for preview
   */
  const convertToAlertQueries = useCallback((dataQueries: DataQuery[]): AlertQuery[] => {
    return dataQueries.map((query) => ({
      refId: query.refId,
      queryType: '',
      model: query,
      datasourceUid: query.datasource?.uid ?? '',
      relativeTimeRange: getDefaultRelativeTimeRange(),
    }));
  }, []);

  /**
   * Run queries preview
   */
  const handleRunQueries = useCallback(() => {
    if (queries.length === 0) {
      return;
    }
    const alertQueries = convertToAlertQueries(queries);
    // For enrichment queries, we don't have a condition, so we pass an empty string
    runQueries(alertQueries, '');
  }, [queries, convertToAlertQueries, runQueries]);

  const handleAddQuery = () => {
    const defaultDataSource = getDefaultOrFirstCompatibleDataSource();
    const newQuery: DataQuery = {
      refId: getNextRefId(queries),
      datasource: defaultDataSource ? { uid: defaultDataSource.uid, type: defaultDataSource.type } : undefined,
    };

    updateQueriesWithRawType([...queries, newQuery]);
  };

  // When we have a single default query with no datasource (new enricher), set default datasource so the user doesn't see "Datasource is missing"
  const hasSetDefaultDatasource = useRef(false);
  useEffect(() => {
    if (hasSetDefaultDatasource.current || queries.length !== 1 || queries[0].datasource?.uid) {
      return;
    }
    const defaultDataSource = getDefaultOrFirstCompatibleDataSource();
    if (!defaultDataSource) {
      return;
    }
    hasSetDefaultDatasource.current = true;
    const updatedQueries: DataQuery[] = [
      {
        ...queries[0],
        datasource: { uid: defaultDataSource.uid, type: defaultDataSource.type },
      },
    ];
    updateQueriesWithRawType(updatedQueries);
  }, [queries, updateQueriesWithRawType]);

  const handleRemoveQuery = ({ refId }: { refId: string }) => {
    const updatedQueries = queries.filter((q: DataQuery) => q.refId !== refId);
    updateQueriesWithRawType(updatedQueries);
  };

  const handleQueryChange = (updatedQuery: DataQuery, index: number) => {
    const updatedQueries = [...queries];
    updatedQueries[index] = updatedQuery;
    updateQueriesWithRawType(updatedQueries);
  };

  const handleDataSourceChange = (dsSettings: DataSourceInstanceSettings, index: number) => {
    const updatedQueries = [...queries];
    updatedQueries[index] = {
      ...updatedQueries[index],
      datasource: { uid: dsSettings.uid, type: dsSettings.type },
    };
    updateQueriesWithRawType(updatedQueries);
  };

  const getDataSourceSettings = (query: DataQuery): DataSourceInstanceSettings | undefined => {
    if (query.datasource?.uid) {
      const dataSourceSrv = getDataSourceSrv();
      const dsSettings = dataSourceSrv.getInstanceSettings(query.datasource.uid);
      if (dsSettings) {
        return dsSettings;
      }
    }
    return undefined;
  };

  return (
    <Stack direction="column" gap={2}>
      <Text variant="bodySmall" color="secondary">
        <Trans
          i18nKey="alert-enrichment-form.dsquery-enricher.raw-queries-description"
          defaults="Define queries that will be executed to enrich your alerts. The results will be available in the enrichment context."
        />
      </Text>

      {queries.length === 0 ? (
        <Stack direction="column" gap={2} alignItems="center">
          <Text color="secondary">
            <Trans i18nKey="alert-enrichment-form.dsquery-enricher.no-queries" defaults="No queries defined yet" />
          </Text>
          <Button onClick={handleAddQuery} variant="secondary" size="sm">
            <Trans i18nKey="alert-enrichment-form.dsquery-enricher.add-first-query" defaults="Add your first query" />
          </Button>
        </Stack>
      ) : (
        <Box borderStyle="solid" borderColor="weak" borderRadius="default" padding={1} backgroundColor="primary">
          <DragDropContext onDragEnd={() => {}}>
            <Droppable droppableId="enrichment-queries" direction="vertical">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <Stack direction="column" gap={1}>
                    {queries.map((query: DataQuery, index: number) => {
                      const dsSettings = getDataSourceSettings(query);
                      const range = rangeUtil.relativeToTimeRange(getDefaultRelativeTimeRange());

                      if (!dsSettings) {
                        return (
                          <Alert
                            severity="error"
                            title={t('alert-enrichment-form.dsquery-enricher.no-datasource', 'Datasource is missing')}
                            key={query.refId}
                          >
                            <Trans
                              i18nKey="alert-enrichment-form.dsquery-enricher.no-datasource-description"
                              defaults="We couldn't find a datasource for this query. The datasource has been removed or is not available"
                            />
                            <Button
                              onClick={() => handleRemoveQuery(query)}
                              variant="secondary"
                              size="sm"
                              icon="trash-alt"
                            >
                              <Trans
                                i18nKey="alert-enrichment-form.dsquery-enricher.remove-query"
                                defaults="Remove query"
                              />
                            </Button>
                          </Alert>
                        );
                      }

                      const queryData: PanelData = queryPreviewData[query.refId] ?? {
                        state: LoadingState.NotStarted,
                        series: [],
                        timeRange: getDefaultTimeRange(),
                      };

                      const showVisualization = queryData.state !== LoadingState.NotStarted;

                      return (
                        <Stack key={query.refId} direction="column" gap={0.5}>
                          <QueryEditorRow
                            id={query.refId}
                            index={index}
                            data={queryData}
                            query={query}
                            queries={queries}
                            dataSource={dsSettings}
                            onChangeDataSource={(settings) => handleDataSourceChange(settings, index)}
                            onChange={(updatedQuery) => handleQueryChange(updatedQuery, index)}
                            onRemoveQuery={handleRemoveQuery}
                            onAddQuery={handleAddQuery}
                            onRunQuery={handleRunQueries}
                            range={range}
                            app={CoreApp.UnifiedAlerting}
                            collapsable={false}
                            hideHideQueryButton={true}
                          />
                          {showVisualization && <VizWrapper data={queryData} />}
                        </Stack>
                      );
                    })}
                    {provided.placeholder}

                    {!isReadOnly && (
                      <Button onClick={handleAddQuery} variant="secondary" size="sm" icon="plus">
                        <Trans i18nKey="alert-enrichment-form.dsquery-enricher.add-query" defaults="Add query" />
                      </Button>
                    )}
                  </Stack>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      )}
    </Stack>
  );
}
