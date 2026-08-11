import { t } from '@grafana/i18n';
import { Checkbox, Stack } from '@grafana/ui';

interface SubsectionCompleteProps {
  checked: boolean;
  onChange: () => void;
}

export function SubsectionComplete({ checked, onChange }: SubsectionCompleteProps) {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <Checkbox
        label={t('secrets-keeper.instructions.section-complete', 'Section complete')}
        checked={checked}
        onChange={onChange}
        data-testid="subsection-complete"
      />
    </Stack>
  );
}
