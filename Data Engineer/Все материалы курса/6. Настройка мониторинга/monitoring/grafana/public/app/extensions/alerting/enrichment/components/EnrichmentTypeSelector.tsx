import { css } from '@emotion/css';
import { useMemo } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Stack, Text, useStyles2 } from '@grafana/ui';

import { getEnricherTypeOptions, type EnrichmentType } from '../form/form';

import { EnricherTypeCard } from './EnricherTypeCard';

export interface EnrichmentTypeSelectorProps {
  onSelect: (type: EnrichmentType) => void;
}

/**
 * Enrichment type selector using EnricherTypeCard list, similar to DataSourceTypeCard / Add data source picker.
 * Each type is shown as a horizontal card with icon, title and description.
 */
export function EnrichmentTypeSelector({ onSelect }: EnrichmentTypeSelectorProps) {
  const styles = useStyles2(getStyles);
  const options = useMemo(() => getEnricherTypeOptions(), []);

  return (
    <Stack direction="column" gap={2}>
      <Text variant="body" color="secondary">
        {t('alerting.enrichment.create-drawer.select-type-description', 'Choose an enrichment type to get started.')}
      </Text>
      <div className={styles.list}>
        {options.map((option) => (
          <EnricherTypeCard
            key={option.value}
            type={option.value}
            label={option.label ?? option.value}
            description={option.description}
            onClick={() => onSelect(option.value)}
          />
        ))}
      </div>
    </Stack>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    list: css({
      '& > *': {
        marginBottom: theme.spacing(1),
      },
      '& > *:last-child': {
        marginBottom: 0,
      },
    }),
  };
}
