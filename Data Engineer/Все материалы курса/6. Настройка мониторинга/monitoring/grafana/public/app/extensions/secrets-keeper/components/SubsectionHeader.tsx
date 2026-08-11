import { useStyles2 } from '@grafana/ui';

import { getInstructionStyles } from './AwsProviderForm/awsProviderInstructionStyles';

interface SubsectionHeaderProps {
  title: string;
}

export function SubsectionHeader({ title }: SubsectionHeaderProps) {
  const styles = useStyles2(getInstructionStyles);
  return (
    <div className={styles.subsectionWrapper}>
      <h4 className={styles.subsectionTitle}>{title}</h4>
    </div>
  );
}
