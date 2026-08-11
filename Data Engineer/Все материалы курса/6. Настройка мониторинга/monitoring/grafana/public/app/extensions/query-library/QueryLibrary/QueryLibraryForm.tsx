import { css } from '@emotion/css';
import { useFormContext } from 'react-hook-form';

import { type GrafanaTheme2, AppEvents } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents } from '@grafana/runtime';
import { useStyles2, Box } from '@grafana/ui';
import { useCreateQueryMutation, useUpdateQueryMutation } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { QueryLibraryInteractions, dirtyFieldsToAnalyticsObject } from '../QueryLibraryAnalyticsEvents';
import { convertAddQueryTemplateCommandToDataQuerySpec } from '../utils/mappers';
import { hasUnresolvedVariables } from '../utils/templateVariables';

import { QueryLibraryActions } from './QueryLibraryActions';
import { type QueryDetails, QueryLibraryDetails } from './QueryLibraryDetails';

export interface QueryLibraryFormProps {
  selectedQueryRow: SavedQuery;
  onEditQuerySuccess: (uid: string, isNew?: boolean) => void;
  usingHistory?: boolean;
}

export function QueryLibraryForm({ selectedQueryRow, onEditQuerySuccess, usingHistory }: QueryLibraryFormProps) {
  const { onSave, triggerAnalyticsEvent } = useQueryLibraryContext();
  const styles = useStyles2(getStyles);

  const {
    handleSubmit,
    formState: { dirtyFields },
  } = useFormContext<QueryDetails>();

  const [editQueryTemplate, { isLoading: isUpdateLoading }] = useUpdateQueryMutation();
  const [addQueryTemplate, { isLoading: isAddLoading }] = useCreateQueryMutation();

  const onSubmit = async (data: QueryDetails) => {
    if (selectedQueryRow?.uid) {
      triggerAnalyticsEvent(QueryLibraryInteractions.saveEditClicked, dirtyFieldsToAnalyticsObject(dirtyFields));

      await editQueryTemplate({
        name: selectedQueryRow.uid,
        patch: {
          spec: { ...data },
        },
      }).unwrap();

      onEditQuerySuccess(selectedQueryRow.uid);
    } else {
      // saved before, because the mutation invalidates tags and, therefore, reinitializes the selected queryRow
      const datasourceType = selectedQueryRow.query.datasource?.type ?? selectedQueryRow.datasourceType?.toLowerCase();

      const response = await addQueryTemplate({
        query: convertAddQueryTemplateCommandToDataQuerySpec({
          title: data.title || t('explore.query-library.default-title', 'New query'),
          description: data.description,
          isVisible: data.isVisible,
          tags: data.tags,
          targets: [selectedQueryRow.query],
          isLocked: true,
        }),
      }).unwrap();

      triggerAnalyticsEvent(QueryLibraryInteractions.saveQuerySuccess, {
        datasourceType: datasourceType,
        hasTemplateVariables: hasUnresolvedVariables(selectedQueryRow.query),
      });

      getAppEvents().publish({
        type: AppEvents.alertSuccess.name,
        payload: [t('explore.query-library.query-template-added', 'Query successfully saved to the library')],
      });

      onEditQuerySuccess(response.metadata?.name!, true);
    }

    onSave?.();
  };

  return (
    <Box element="form" onSubmit={handleSubmit(onSubmit)} display="flex" direction="column" flex={1}>
      <Box flex={1}>
        <QueryLibraryDetails query={selectedQueryRow} usingHistory={usingHistory} />
      </Box>
      <div className={styles.actions}>
        <QueryLibraryActions
          selectedQueryRow={selectedQueryRow}
          isSavingLoading={isUpdateLoading || isAddLoading}
          usingHistory={usingHistory}
          onEditQuerySuccess={onEditQuerySuccess}
        />
      </div>
    </Box>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  actions: css({
    background: theme.colors.background.primary,
    bottom: 0,
    padding: theme.spacing(1, 0),
    position: 'sticky',
    zIndex: theme.zIndex.tooltip,
  }),
});
