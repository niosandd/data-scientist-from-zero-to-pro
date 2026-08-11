import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { SavedQueriesDetailsPanel } from './SavedQueriesDetailsPanel';

type Props = {
  selectedQuery: SavedQuery | undefined;
  onTitleChange?: (title: string | undefined) => void;
  onDelete?: () => void;
  onSaveNew: (uid: string) => void;
};

// Right-side detail area: renders the full details panel when a query is selected, or nothing otherwise.
export function SavedQueriesDetails({ selectedQuery, onTitleChange, onDelete, onSaveNew }: Props) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      {selectedQuery && (
        <SavedQueriesDetailsPanel
          key={selectedQuery.uid ?? 'new-query'}
          query={selectedQuery}
          onTitleChange={onTitleChange}
          onDelete={onDelete}
          onSaveNew={onSaveNew}
        />
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingTop: theme.spacing(0),
    paddingBottom: theme.spacing(0),
    [theme.breakpoints.down('lg')]: {
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      paddingTop: theme.spacing(1),
    },
  }),
});
