import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';

/** Shared styles for keeper instruction section components. */
export const getInstructionStyles = (theme: GrafanaTheme2) => ({
  iconComplete: css({
    color: theme.colors.success.text,
  }),
  iconIncomplete: css({
    color: theme.colors.text.secondary,
  }),
  drawerBox: css({
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    overflow: 'hidden',
    padding: `0 ${theme.spacing(2)}`,
  }),
  sectionHeader: css({
    padding: `${theme.spacing(0.75)} 0`,
  }),
  sectionContent: css({
    paddingTop: theme.spacing(0.25),
  }),
  nestedContent: css({
    padding: `${theme.spacing(1)} 0`,
  }),
  subsectionWrapper: css({
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    borderTop: `1px solid ${theme.colors.border.weak}`,
  }),
  subsectionTitle: css({
    // Reset the browser default heading margin so the <h4> sits flush with the wrapper padding.
    margin: 0,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
  }),
  stepList: css({
    margin: 0,
    paddingLeft: theme.spacing(3),
    '& li': {
      marginBottom: theme.spacing(1),
      color: theme.colors.text.primary,
      lineHeight: theme.typography.body.lineHeight,
    },
  }),
  codeBlock: css({
    position: 'relative',
    paddingBottom: theme.spacing(1),
  }),
  copyButton: css({
    position: 'absolute',
    top: 0,
    right: 0,
    borderTopLeftRadius: 'unset',
    borderBottomRightRadius: 'unset',
  }),
  inlineCopyButton: css({
    // Button renders a two-column flex layout; the empty text column still emits a gap.
    gap: 0,
  }),
  codeText: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
    margin: 0,
    whiteSpace: 'pre',
    overflowX: 'auto',
  }),
  bodyText: css({
    margin: `0 0 ${theme.spacing(0.5)} 0`,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.body.lineHeight,
  }),
  requiredNote: css({
    margin: 0,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
});
