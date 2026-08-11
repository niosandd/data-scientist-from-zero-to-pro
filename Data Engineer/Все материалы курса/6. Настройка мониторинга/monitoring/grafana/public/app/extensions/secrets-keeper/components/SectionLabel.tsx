import { Icon, Stack, useStyles2 } from '@grafana/ui';

import { getInstructionStyles } from './AwsProviderForm/awsProviderInstructionStyles';

interface SectionLabelProps {
  isComplete: boolean;
  title: string;
}

export function SectionLabel({ isComplete, title }: SectionLabelProps) {
  const styles = useStyles2(getInstructionStyles);
  return (
    <Stack direction="row" gap={1} alignItems="center">
      <Icon
        name={isComplete ? 'check-circle' : 'circle'}
        className={isComplete ? styles.iconComplete : styles.iconIncomplete}
      />
      <span>{title}</span>
    </Stack>
  );
}
