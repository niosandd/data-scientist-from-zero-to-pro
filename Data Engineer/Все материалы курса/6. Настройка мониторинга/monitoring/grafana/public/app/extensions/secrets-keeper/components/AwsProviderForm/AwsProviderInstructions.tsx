import { useState } from 'react';

import { Stack, useStyles2 } from '@grafana/ui';

import { type SectionNumber, type SectionOpenState } from '../../types';

import { AwsProviderSection1 } from './AwsProviderSection1';
import { AwsProviderSection2 } from './AwsProviderSection2';
import { AwsProviderSection3 } from './AwsProviderSection3';
import { AwsProviderSection4 } from './AwsProviderSection4';
import { getInstructionStyles } from './awsProviderInstructionStyles';

/**
 * Orchestrates the 4-section AWS keeper setup accordion.
 * Sections 1-3 are instruction steps; section 4 is the configuration form.
 * All section open/close state is managed here — no external callbacks or slots.
 * Each section is wrapped in a drawerBox for consistent background + border.
 */
export function AwsProviderInstructions() {
  const styles = useStyles2(getInstructionStyles);
  const [sectionOpen, setSectionOpen] = useState<SectionOpenState>({ 1: true, 2: false, 3: false, 4: false });

  const toggle = (n: SectionNumber) => setSectionOpen((p) => ({ ...p, [n]: !p[n] }));

  const advance = (current: Exclude<SectionNumber, 4>) => {
    const next = (current + 1) as SectionNumber;
    setSectionOpen((p) => ({ ...p, [current]: false, [next]: true }));
  };

  return (
    <Stack direction="column" gap={2} data-testid="aws-keeper-instructions">
      <div className={styles.drawerBox}>
        <AwsProviderSection1 isOpen={sectionOpen[1]} onToggle={() => toggle(1)} onContinue={() => advance(1)} />
      </div>
      <div className={styles.drawerBox}>
        <AwsProviderSection2 isOpen={sectionOpen[2]} onToggle={() => toggle(2)} onContinue={() => advance(2)} />
      </div>
      <div className={styles.drawerBox}>
        <AwsProviderSection3 isOpen={sectionOpen[3]} onToggle={() => toggle(3)} onContinue={() => advance(3)} />
      </div>
      <div className={styles.drawerBox}>
        <AwsProviderSection4 isOpen={sectionOpen[4]} onToggle={() => toggle(4)} />
      </div>
    </Stack>
  );
}
