import { css } from '@emotion/css';

import type { GrafanaTheme2 } from '@grafana/data';

export function getClickableTitleStyles(theme: GrafanaTheme2) {
  return {
    clickableTitle: css({
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      font: 'inherit',
      textAlign: 'left',
      color: 'inherit',
      '&:hover': {
        textDecoration: 'underline',
      },
    }),
    actionsHeader: css({
      display: 'block',
      textAlign: 'right',
      paddingRight: theme.spacing(3),
    }),
  };
}
