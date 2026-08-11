import { css } from '@emotion/css';
import { type JSX } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { Badge, Card, Stack, useStyles2 } from '@grafana/ui';

import { getCreateKeeperUrl, getKeeperProviders } from '../constants';
import { type KeeperFormValues } from '../types';

const CARD_GRID_MAX_WIDTH = 1000;

export const KeeperTypeChooser = (): JSX.Element => {
  const styles = useStyles2(getStyles);
  const providers = getKeeperProviders();

  return (
    <ul className={styles.grid}>
      {providers.map((provider) => (
        <li key={provider.id} className={styles.gridItem}>
          <Card noMargin className={styles.card} href={getCreateKeeperUrl(provider.id as KeeperFormValues['type'])}>
            <Card.Figure className={styles.figure}>
              <img src={provider.logoSrc} alt="" />
            </Card.Figure>
            <Card.Heading className={styles.heading}>{provider.name}</Card.Heading>
            <Card.Description>{provider.description}</Card.Description>
            <Card.Tags className={styles.tags}>
              <Stack direction="row" gap={0.5} wrap="wrap">
                {provider.tags.map((tag) => (
                  <Badge key={tag} text={tag} color="blue" />
                ))}
              </Stack>
            </Card.Tags>
          </Card>
        </li>
      ))}
    </ul>
  );
};

const CARD_GRID_TEMPLATE = `
  "Figure"      auto
  "Heading"     auto
  "Description" 1fr
  "Tags"        auto
  / 1fr
`;

const getStyles = (theme: GrafanaTheme2) => ({
  grid: css({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
    gap: theme.spacing(2),
    maxWidth: CARD_GRID_MAX_WIDTH,
    listStyle: 'none',
    padding: 0,
    margin: 0,
  }),
  gridItem: css({
    listStyle: 'none',
  }),
  card: css({
    gridTemplate: CARD_GRID_TEMPLATE,
    height: '100%',
    padding: theme.spacing(3),
    borderRadius: theme.shape.radius.default,
    borderBottomStyle: 'none',
  }),
  figure: css({
    width: 'inherit',
    marginRight: 0,
    marginBottom: theme.spacing(1),
    '& img': {
      width: theme.spacing(5),
      height: theme.spacing(5),
      objectFit: 'contain',
    },
  }),
  heading: css({
    marginBottom: theme.spacing(1),
  }),
  tags: css({
    marginTop: theme.spacing(1),
  }),
});
