import { css, cx } from '@emotion/css';

import { colorManipulator, type GrafanaTheme2 } from '@grafana/data';
import { Card, Icon, type IconName, useStyles2 } from '@grafana/ui';

import type { EnrichmentType } from '../form/form';

const enricherTypeIcon: Partial<Record<EnrichmentType, IconName>> = {
  assign: 'tag-alt',
  external: 'external-link-alt',
  dsquery: 'database',
  sift: 'search',
  asserts: 'heart-rate',
  explain: 'comment-alt',
  assistant: 'ai-sparkle',
};

/** Visualization palette names — one per type so each card has a distinct color (blue, purple, green, orange, red, yellow) */
const enricherTypeVizColor: Partial<Record<EnrichmentType, string>> = {
  assign: 'blue',
  external: 'purple',
  dsquery: 'green',
  asserts: 'orange',
  sift: 'red',
  explain: 'yellow',
  assistant: 'semi-dark-purple',
};

function getIconForType(type: EnrichmentType): IconName {
  return enricherTypeIcon[type] ?? 'cog';
}

export type EnricherTypeCardProps = {
  type: EnrichmentType;
  label: string;
  description?: string;
  onClick: () => void;
};

/**
 * Card for a single enrichment type, matching the layout of DataSourceTypeCard:
 * horizontal card with icon (left), heading, and description.
 */
export function EnricherTypeCard({ type, label, description, onClick }: EnricherTypeCardProps) {
  const styles = useStyles2(getStyles, enricherTypeVizColor[type] ?? 'blue');

  return (
    <Card noMargin className={cx(styles.card, 'card-parent')} onClick={onClick} data-testid={`enrichment-type-${type}`}>
      <Card.Heading className={styles.heading}>{label}</Card.Heading>

      <Card.Figure align="center" className={cx(styles.figure, styles.figureColor)}>
        <Icon name={getIconForType(type)} size="xl" className={styles.icon} />
      </Card.Figure>

      {description && <Card.Description className={styles.description}>{description}</Card.Description>}
    </Card>
  );
}

function getStyles(theme: GrafanaTheme2, vizColorName = 'blue') {
  const mainColor = theme.visualization.getColorByName(vizColorName);
  const iconBg = colorManipulator.alpha(mainColor, 0.15);

  return {
    heading: css({
      fontSize: theme.v1.typography.heading.h5,
      fontWeight: 'inherit',
    }),
    figure: css({
      width: 'inherit',
      marginRight: theme.spacing(3),
      marginLeft: theme.spacing(0.5),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    figureColor: css({
      width: theme.spacing(7),
      minWidth: theme.spacing(7),
      height: theme.spacing(7),
      borderRadius: theme.shape.radius.default,
      backgroundColor: iconBg,
    }),
    description: css({
      margin: theme.spacing(0.5, 0, 0),
      fontSize: theme.typography.size.sm,
      lineHeight: theme.typography.body.lineHeight,
    }),
    icon: css({
      color: mainColor,
    }),
    card: css({
      gridTemplateAreas: `
        "Figure   Heading"
        "Figure Description"`,
      gridTemplateColumns: 'auto 1fr',
      padding: theme.spacing(2, 3),
    }),
  };
}
