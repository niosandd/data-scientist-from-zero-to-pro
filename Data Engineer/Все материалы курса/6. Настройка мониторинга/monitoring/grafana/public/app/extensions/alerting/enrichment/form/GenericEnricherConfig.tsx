import { capitalize } from 'lodash';

import { Trans } from '@grafana/i18n';
import { Stack, Text } from '@grafana/ui';

interface GenericEnricherConfigProps {
  enricherType: 'asserts' | 'sift' | 'assistant';
  stepPath: `steps.${number}`;
}

export function GenericEnricherConfig({ enricherType }: GenericEnricherConfigProps) {
  const getDisplayName = (type: string) => {
    if (type === 'assistant') {
      return 'Assistant Investigations';
    }
    if (type === 'asserts') {
      return 'RCA Workbench';
    }
    return capitalize(type);
  };

  return (
    <Stack direction="column" gap={2}>
      <Text variant="body" color="info">
        <Trans
          i18nKey={`alert-enrichment-form.${enricherType}-enricher.description`}
          defaults="{{enricherType}} enricher does not require any configuration. It will start enriching alerts as soon as it is enabled."
          values={{ enricherType: getDisplayName(enricherType) }}
        />
      </Text>
    </Stack>
  );
}
