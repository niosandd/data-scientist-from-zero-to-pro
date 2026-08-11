import { css } from '@emotion/css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Skeleton from 'react-loading-skeleton';

import { dateTime, type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Avatar, Box, Button, Field, Input, ScrollContainer, Stack, TagsInput, Text, useStyles2 } from '@grafana/ui';
import { useCreateQueryMutation, useUpdateQueryMutation } from 'app/extensions/api/clients/queries/v1beta1';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { DrilldownExtensionPoint } from '../../../features/explore/extensions/DrilldownExtensionPoint';
import { type QueryDetails } from '../QueryLibrary/QueryLibraryDetails';
import { QueryLibraryInteractions, dirtyFieldsToAnalyticsObject } from '../QueryLibraryAnalyticsEvents';
import { canEditQuery } from '../utils/identity';
import { convertAddQueryTemplateCommandToDataQuerySpec } from '../utils/mappers';
import { onOpenInExplore } from '../utils/navigation';
import { hasUnresolvedVariables } from '../utils/templateVariables';
import { useDatasource } from '../utils/useDatasource';

import { SavedQueriesCloseGuard } from './SavedQueriesCloseGuard';
import { SavedQueryDetailActions } from './SavedQueryDetailActions';
import { applyTemplateVariableOverrides, SavedQueryVariableAdjuster } from './SavedQueryVariableAdjuster';

type Props = {
  query: SavedQuery;
  onTitleChange?: (title: string | undefined) => void;
  onDelete?: () => void;
  onSaveNew: (uid: string) => void;
};

// Full detail/edit form for a selected query: title, query display, template variable adjuster,
// metadata fields (datasource, description, tags, author, date), and a footer with action buttons.
export function SavedQueriesDetailsPanel({ query, onTitleChange, onDelete, onSaveNew }: Props) {
  const styles = useStyles2(getStyles);

  const {
    context,
    clearCloseGuard,
    closeDrawer,
    onSelectQuery,
    setNewQuery,
    onSave,
    setCloseGuard,
    isEditingQuery,
    setIsEditingQuery,
    openedToSaveQuery,
    templateVariableOverrides,
    setTemplateVariableOverrides,
    triggerAnalyticsEvent,
  } = useQueryLibraryContext();
  const { loading: datasourceApiLoading } = useDatasource(query.datasourceRef);
  const hasTemplateVariables = hasUnresolvedVariables(query.query);
  const [updateQuery, { isLoading: isUpdateLoading }] = useUpdateQueryMutation();
  const [createQuery, { isLoading: isCreateLoading }] = useCreateQueryMutation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setFocus,
    formState: { isDirty, isSubmitting, dirtyFields },
  } = useForm<QueryDetails>({
    defaultValues: {
      title: query.title ?? '',
      description: query.description ?? '',
      tags: query.tags ?? [],
      isVisible: query.isVisible ?? true,
    },
  });

  const [isCloseGuardOpen, setIsCloseGuardOpen] = useState(false);
  // Ref used to restore focus to the Edit button after the close guard is dismissed via Discard.
  // This keeps focus inside the modal so useDismiss retains control of Esc and its stopPropagation
  // prevents keybindingSrv's global Esc handler from firing exit() and closing panel-edit.
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // No uid means this is a pending create — the form was opened via "Save query" before any API call
  const isNew = !query.uid;
  const isSaving = isSubmitting || isUpdateLoading || isCreateLoading;
  const canEdit = canEditQuery(query);
  const titleValue = watch('title');

  // Focus the title input whenever editing starts.
  // setTimeout defers past FloatingFocusManager's initial-focus effect so we win the race
  // when the modal and panel mount in the same render cycle (e.g. reopening with newQuery already set).
  useEffect(() => {
    if (!isEditingQuery) {
      return;
    }

    const timer = window.setTimeout(() => setFocus('title'), 0);
    return () => window.clearTimeout(timer);
  }, [isEditingQuery, setFocus]);

  // Sync the live title up to the list so the card updates while the user types.
  // Passing undefined when not editing intentionally clears the override so the card
  // falls back to the last-saved title.
  useEffect(() => {
    onTitleChange?.(isEditingQuery ? titleValue : undefined);
  }, [titleValue, isEditingQuery, onTitleChange]);

  // Reset template variable overrides whenever the selected query changes.
  useEffect(() => {
    setTemplateVariableOverrides({});
  }, [query.uid, setTemplateVariableOverrides]);

  const formattedDate = dateTime(query.createdAtTimestamp).format('ddd MMM DD YYYY HH:mm [GMT]ZZ');

  const onSubmit = async (data: QueryDetails) => {
    if (query.uid) {
      triggerAnalyticsEvent(QueryLibraryInteractions.saveEditClicked, dirtyFieldsToAnalyticsObject(dirtyFields));
      await updateQuery({ name: query.uid, patch: { spec: { ...data } } }).unwrap();
      if (context === 'unknown') {
        // "unknown" context means the modal was opened outside of apps like Explore, Panel-Editor, etc.
        // Usually means Query History. This will eventually be removed once Query History / Recent tab is handled.
        closeDrawer();
      } else {
        reset(data);
        setIsEditingQuery(false);
      }
    } else {
      const result = await createQuery({
        query: convertAddQueryTemplateCommandToDataQuerySpec({
          title: data.title || t('saved-queries.details.default-title', 'New query'),
          description: data.description,
          isVisible: data.isVisible,
          tags: data.tags,
          targets: [query.query],
        }),
      }).unwrap();

      triggerAnalyticsEvent(QueryLibraryInteractions.saveQuerySuccess, {
        datasourceType: query.datasourceType,
        hasTemplateVariables,
      });

      setNewQuery(undefined);
      setIsEditingQuery(false);
      onSave?.();
      onSaveNew?.(result.metadata?.name ?? '');
      if (context === 'unknown') {
        closeDrawer();
      }
    }
  };

  // Shared reset handler used by both the cancel button and the discard confirmation modal.
  // For new queries, clears the pending newQuery from context so the card disappears from the list.
  const resetForm = useCallback(() => {
    if (isNew) {
      triggerAnalyticsEvent(QueryLibraryInteractions.cancelSaveNewQueryClicked);
      setNewQuery(undefined);
    } else {
      triggerAnalyticsEvent(QueryLibraryInteractions.cancelEditClicked);
    }
    reset();
    setIsEditingQuery(false);
  }, [isNew, triggerAnalyticsEvent, setNewQuery, reset, setIsEditingQuery]);

  // Intercept modal close when there are unsaved edits. Skipped for 'unknown' context because
  // cancel already closes the modal there, so the guard would never fire.
  useEffect(() => {
    setCloseGuard(() => {
      if (isEditingQuery && isDirty && context !== 'unknown') {
        setIsCloseGuardOpen(true);
        return false;
      }
      return true;
    });
    return () => {
      setCloseGuard(() => true);
    };
  }, [isEditingQuery, isDirty, context, setCloseGuard]);

  const onCancel = () => {
    if (isDirty && context !== 'unknown') {
      setIsCloseGuardOpen(true);
      return;
    }
    resetForm();
    if (context === 'unknown' || openedToSaveQuery) {
      closeDrawer();
    }
  };

  return (
    <>
      <form
        className={styles.panel}
        onSubmit={handleSubmit(onSubmit)}
        aria-label={t('saved-queries.details.panel-aria-label', 'Query details: {{title}}', {
          title: query.title ?? '',
        })}
      >
        <div role="status" className={styles.srOnly}>
          {isEditingQuery ? t('saved-queries.details.editing-mode', 'Editing query') : ''}
        </div>
        <ScrollContainer overflowX="hidden">
          <Box paddingTop={1} paddingX={1}>
            {/* Header: Title */}
            <div className={styles.header}>
              {isEditingQuery ? (
                <Box flex={1}>
                  <Input {...register('title')} />
                </Box>
              ) : (
                <Box flex={1} minWidth={0}>
                  <Text element="h5" truncate>
                    {query.title ?? ''}
                  </Text>
                </Box>
              )}
            </div>

            {/* Query display */}
            <Box marginBottom={2}>
              {datasourceApiLoading ? (
                <Box marginY={2}>
                  <Skeleton height={48} />
                </Box>
              ) : (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                <code className={styles.queryCode} tabIndex={0}>
                  {query.queryText || JSON.stringify(query.query, null, 2)}
                </code>
              )}
              {context === 'explore' && query.uid && (
                <Button
                  size="sm"
                  variant="success"
                  fill="text"
                  type="button"
                  onClick={() => {
                    triggerAnalyticsEvent(QueryLibraryInteractions.editInExploreClicked, {
                      datasourceType: query.datasourceType,
                    });
                    onOpenInExplore(query, closeDrawer);
                  }}
                >
                  {t('saved-queries.details.edit-in-explore', 'Edit in Explore')}
                </Button>
              )}
              {hasTemplateVariables && !isEditingQuery && (
                <Box marginTop={2}>
                  <SavedQueryVariableAdjuster
                    query={query}
                    overrides={templateVariableOverrides}
                    onChangeOverrides={setTemplateVariableOverrides}
                  />
                </Box>
              )}
            </Box>

            {/* Details fields */}
            <Field label={t('saved-queries.details.datasource', 'Data source')}>
              <Input readOnly value={query.datasourceName ?? ''} />
            </Field>

            <Field label={t('saved-queries.details.description', 'Description')}>
              <Input readOnly={!isEditingQuery} {...register('description')} />
            </Field>

            <Field label={t('saved-queries.details.tags', 'Tags')} htmlFor="tags">
              <Controller
                name="tags"
                control={control}
                defaultValue={query.tags ?? []}
                render={({ field: { ref, value, onChange, ...field } }) => (
                  <TagsInput
                    {...field}
                    id="tags"
                    disabled={!isEditingQuery}
                    onChange={(tags) => onChange(Array.from(new Set(tags)).sort())} // deduplicate + sort
                    tags={value ? Array.from(value) : []}
                    autoColors={false}
                  />
                )}
              />
            </Field>

            <Field label={t('saved-queries.details.author', 'Author')}>
              <Input
                readOnly
                prefix={
                  query.user?.avatarUrl ? (
                    <Box marginRight={0.5}>
                      <Avatar width={2} height={2} src={query.user.avatarUrl} alt="" />
                    </Box>
                  ) : undefined
                }
                value={query.user?.displayName ?? ''}
              />
            </Field>

            <Field label={t('saved-queries.details.date-added', 'Date added')}>
              <Input readOnly value={formattedDate} />
            </Field>
          </Box>
        </ScrollContainer>

        {/* Footer: Duplicate/Delete on left, Edit/Save/Cancel on right */}
        <div className={styles.footer}>
          <SavedQueryDetailActions query={query} disabled={isEditingQuery || isNew} onDelete={onDelete} />
          {isEditingQuery ? (
            <Stack key="edit-mode" gap={1} alignItems="center">
              <Button variant="secondary" size="sm" onClick={onCancel} type="button">
                {t('saved-queries.details.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSaving}
                icon={isSaving ? 'spinner' : undefined}
              >
                {context === 'unknown'
                  ? t('saved-queries.details.save-and-close', 'Save and close')
                  : t('saved-queries.details.save', 'Save')}
              </Button>
            </Stack>
          ) : (
            <Stack key="view-mode" gap={1}>
              {query.uid && context !== 'drilldown' && (
                <DrilldownExtensionPoint
                  compact
                  queries={[query.query]}
                  onExtensionClick={() => {
                    triggerAnalyticsEvent(QueryLibraryInteractions.openInDrilldownClicked);
                  }}
                />
              )}
              <Button
                ref={editButtonRef}
                variant="secondary"
                size="sm"
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  triggerAnalyticsEvent(QueryLibraryInteractions.editQueryClicked);
                  setIsEditingQuery(true);
                }}
              >
                {t('saved-queries.details.edit', 'Edit')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => {
                  const { query: resolvedQuery, templateVariablesChanged } = applyTemplateVariableOverrides(
                    query,
                    templateVariableOverrides
                  );
                  triggerAnalyticsEvent(QueryLibraryInteractions.selectQueryClicked, {
                    hasTemplateVariables,
                    templateVariablesChanged,
                  });
                  onSelectQuery(resolvedQuery, query.title);
                  closeDrawer(true);
                }}
              >
                {t('saved-queries.details.select', 'Select query')}
              </Button>
            </Stack>
          )}
        </div>
      </form>
      <SavedQueriesCloseGuard
        isOpen={isCloseGuardOpen}
        onConfirm={() => {
          setIsCloseGuardOpen(false);
          resetForm();
          if (openedToSaveQuery) {
            clearCloseGuard();
            closeDrawer(false, false);
          } else {
            // Deferred so the Edit button is visible in the DOM before we focus it
            // (resetForm sets isEditingQuery → false, which re-renders view mode).
            window.setTimeout(() => editButtonRef.current?.focus(), 0);
          }
        }}
        onDismiss={() => setIsCloseGuardOpen(false)}
      />
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  panel: css({
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    marginBottom: theme.spacing(2),
  }),
  footer: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing(1),
    borderTop: `1px solid ${theme.colors.border.weak}`,
  }),
  srOnly: css({
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  }),
  queryCode: css({
    backgroundColor: theme.colors.action.disabledBackground,
    borderRadius: theme.shape.radius.default,
    display: 'block',
    overflowWrap: 'break-word',
    padding: theme.spacing(1),
    whiteSpace: 'pre-wrap',
    fontSize: theme.typography.bodySmall.fontSize,
  }),
});
