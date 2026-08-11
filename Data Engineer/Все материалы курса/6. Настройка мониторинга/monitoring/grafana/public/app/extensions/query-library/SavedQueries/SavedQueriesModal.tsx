import { css } from '@emotion/css';
import { useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useFlagQueryHistoryRecentQueriesUI } from '@grafana/runtime/internal';
import { Alert, Button, Modal, Tab, TabsBar, useStyles2 } from '@grafana/ui';
import { RecentQueriesDescription } from 'app/features/explore/RecentQueries/RecentQueriesDescription';
import { RecentQueriesLayout } from 'app/features/explore/RecentQueries/RecentQueriesLayout';

import { useQueryLibraryContext } from '../../../features/explore/QueryLibrary/QueryLibraryContext';
import { QueryLibraryTab } from '../../../features/explore/QueryLibrary/types';
import { QueryLibraryInteractions } from '../QueryLibraryAnalyticsEvents';

import { SavedQueriesLayout } from './SavedQueriesLayout';

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScHILHDfIJG8ChaU42AWoGVBR78hIwvvUE-15_A0G5miHgvhQ/viewform?usp=header';

const FEEDBACK_DISMISSED_KEY = 'savedQueriesFeedbackDismissed';

// Top-level modal shell: renders the query layout with an optional dismissible feedback banner.
export function SavedQueriesModal() {
  const {
    isDrawerOpen,
    closeDrawer,
    activeTab,
    onTabChange,
    onSelectQuery,
    onSelectQueries,
    onAddHistoryQueryToLibrary,
    triggerAnalyticsEvent,
  } = useQueryLibraryContext();
  const styles = useStyles2(getStyles);
  const recentQueriesUI = useFlagQueryHistoryRecentQueriesUI();
  // When the flag is off, never treat the Recent tab as active even if a stale persisted
  // activeTab still says RECENT — fall back to the Saved queries view.
  const isRecentTabActive = recentQueriesUI && activeTab === QueryLibraryTab.RECENT;
  const [isFeedbackDismissed, setIsFeedbackDismissed] = useState(
    () => localStorage.getItem(FEEDBACK_DISMISSED_KEY) === 'true'
  );

  // Feedback button will be removed shortly after receiving feedback after launch.
  const openFeedback = () => window.open(FEEDBACK_URL, '_blank');

  const modalTitle = (
    <div className={styles.titleColumn}>
      <div className={styles.titleRow}>
        <TabsBar className={styles.tabsBar} hideBorder>
          <Tab
            label={t('saved-queries.modal.tabs.saved', 'Saved queries')}
            active={!isRecentTabActive}
            onChangeTab={() => onTabChange(QueryLibraryTab.ALL)}
          />
          {recentQueriesUI && (
              <Tab
                label={t('saved-queries.modal.tabs.recent', 'Recent queries')}
                active={activeTab === QueryLibraryTab.RECENT}
                onChangeTab={() => onTabChange(QueryLibraryTab.RECENT)}
              />
          )}
        </TabsBar>
        {isFeedbackDismissed && (
          <Button
            fill="text"
            variant="secondary"
            icon="comment-alt-message"
            onClick={openFeedback}
            className={styles.feedbackButton}
          >
            {t('saved-queries.feedback.button', 'Give feedback')}
          </Button>
        )}
      </div>
      {isRecentTabActive && <RecentQueriesDescription />}
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      ariaLabel={t('saved-queries.modal.aria-label', 'Saved queries')}
      isOpen={isDrawerOpen}
      onDismiss={() => closeDrawer(false)}
      className={styles.modal}
      contentClassName={styles.content}
    >
      {!isFeedbackDismissed && (
        <div className={styles.feedbackAlertContainer}>
          <Alert
            severity="info"
            title={t(
              'saved-queries.feedback.alert-text',
              'We recently redesigned Saved queries and would love your thoughts!'
            )}
            action={
              <Button variant="secondary" onClick={openFeedback}>
                {t('saved-queries.feedback.button', 'Give feedback')}
              </Button>
            }
            onRemove={() => {
              localStorage.setItem(FEEDBACK_DISMISSED_KEY, 'true');
              setIsFeedbackDismissed(true);
            }}
          />
        </div>
      )}
      {isRecentTabActive ? (
        <RecentQueriesLayout
          onSelectQuery={(query) => {
            if (onSelectQueries) {
              onSelectQueries(query.queries, query.datasourceName);
            } else {
              onSelectQuery(query.queries[0], query.datasourceName);
            }
            closeDrawer(true);
          }}
          onClose={() => closeDrawer(false)}
          onSaveToLibrary={(query) =>
            onAddHistoryQueryToLibrary({
              query: query.queries[0],
              datasourceName: query.datasourceName,
              description: query.comment,
              datasourceRef: { uid: query.datasourceUid, type: query.queries[0].datasource?.type },
            })
          }
          onAnalyticsEvent={(event, properties) => {
            // OSS RecentQueriesLayout can emit events (e.g. 'queryStarred') that have
            // no enterprise interaction mapping — drop those instead of crashing.
            const interaction = QueryLibraryInteractions[event];
            if (interaction) {
              triggerAnalyticsEvent(interaction, properties);
            }
          }}
        />
      ) : (
        <SavedQueriesLayout />
      )}
    </Modal>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  modal: css({
    width: '90vw',
    maxWidth: '1400px',
    '& [class*="modalHeader"]': {
      '> div:last-child': {
        flexGrow: 0,
        marginLeft: theme.spacing(2),
        marginTop: theme.spacing(1),
        alignSelf: 'flex-start',
      },

      paddingTop: theme.spacing(3),
      paddingBottom: theme.spacing(3),
    },
  }),
  content: css({
    display: 'flex',
    flexDirection: 'column',
    height: '70vh',
    overflow: 'hidden',
    padding: 0,
  }),
  titleColumn: css({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: theme.spacing(3),
  }),
  titleRow: css({
    display: 'flex',
    flex: 1,
    alignItems: 'flex-end',
  }),
  feedbackButton: css({
    marginLeft: 'auto',
  }),
  tabsBar: css({
    marginBottom: 0,
  }),
  feedbackAlertContainer: css({
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
});
