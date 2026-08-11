import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Drawer, Stack, Text, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { useQueryLibraryContext } from '../../features/explore/QueryLibrary/QueryLibraryContext';

import { QueryLibrary } from './QueryLibrary/QueryLibrary';
import { QueryLibraryTab } from './types';
import { hasWritePermissions } from './utils/identity';

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScHILHDfIJG8ChaU42AWoGVBR78hIwvvUE-15_A0G5miHgvhQ/viewform?usp=header';

export const QUERY_LIBRARY_LOCAL_STORAGE_KEYS = {
  explore: {
    newButton: 'grafana.explore.query-library.newButton',
  },
};

/**
 * Drawer with query library feature. Handles its own state and should be included in some top level component.
 */
export function QueryLibraryDrawer() {
  const { activeTab, onTabChange, newQuery, isDrawerOpen, closeDrawer } = useQueryLibraryContext();
  const styles = useStyles2(getStyles);

  return (
    isDrawerOpen && (
      <Drawer
        title={
          <Stack alignItems="center">
            <Text element="h3">{t('query-library.drawer.title', 'Saved queries')}</Text>
          </Stack>
        }
        onClose={() => closeDrawer(false)}
        scrollableContent={false}
        tabs={
          <TabsBar>
            <Tab
              label={t('query-library.tabs.all', 'All')}
              active={activeTab === QueryLibraryTab.ALL}
              onChangeTab={() => onTabChange(QueryLibraryTab.ALL)}
            />
            <Tab
              label={t('query-library.tabs.favorites', 'Favorites')}
              active={activeTab === QueryLibraryTab.FAVORITES}
              onChangeTab={() => onTabChange(QueryLibraryTab.FAVORITES)}
              disabled={!!newQuery}
            />
            {hasWritePermissions() && (
              <Tab
                label={t('query-library.tabs.recent', 'Recent')}
                active={activeTab === QueryLibraryTab.RECENT}
                onChangeTab={() => onTabChange(QueryLibraryTab.RECENT)}
                disabled={!!newQuery}
              />
            )}
            <Tab
              icon="comment-alt-message"
              href={FEEDBACK_URL}
              target="_blank"
              label={t('query-library.tabs.feedback', 'Give feedback')}
              active={activeTab === QueryLibraryTab.FEEDBACK}
              className={styles.feedbackTab}
            />
          </TabsBar>
        }
      >
        <QueryLibrary />
      </Drawer>
    )
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  feedbackTab: css({
    marginLeft: 'auto',
  }),
});
