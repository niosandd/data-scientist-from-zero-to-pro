import { type ChangeEvent, useId } from 'react';
import { useFormContext } from 'react-hook-form';

import { t } from '@grafana/i18n';
import { Field, Input, Stack } from '@grafana/ui';

import { type KeeperFormValuesBase } from '../types';
import { transformKeeperName, validateKeeperDescription, validateKeeperName } from '../validation';

/**
 * Shared name + description fields for all keeper types.
 * Uses `useFormContext<KeeperFormValuesBase>()` so it works with any provider's form values
 * (all extend KeeperFormValuesBase).
 */
interface KeeperDetailsFieldsProps {
  isNameDisabled?: boolean;
}

export function KeeperDetailsFields({ isNameDisabled = false }: KeeperDetailsFieldsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<KeeperFormValuesBase>();

  const { onChange: onNameChange, ...nameRegistration } = register('name', { validate: validateKeeperName });

  const handleNameOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectionStart = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
    event.currentTarget.value = transformKeeperName(event.currentTarget.value);

    // Fire-and-forget: don't await so setSelectionRange runs synchronously
    // (awaiting would defer cursor restoration past a React re-render)
    void onNameChange(event);

    event.currentTarget.setSelectionRange(selectionStart, selectionStart);
  };

  const nameId = useId();
  const descriptionId = useId();

  return (
    <Stack direction="column" gap={2}>
      <Field
        label={t('secrets-keeper.form.name.label', 'Name')}
        description={t('secrets-keeper.form.name.description', 'A unique name for this keeper')}
        invalid={!!errors.name}
        error={errors.name?.message}
        required
        htmlFor={nameId}
        noMargin
      >
        <Input
          {...nameRegistration}
          {...(!isNameDisabled && { onChange: handleNameOnChange })}
          id={nameId}
          disabled={isNameDisabled}
          aria-required="true"
          aria-invalid={!!errors.name}
        />
      </Field>

      <Field
        label={t('secrets-keeper.form.description.label', 'Description')}
        description={t(
          'secrets-keeper.form.description.description',
          'Short description of the purpose of this keeper'
        )}
        invalid={!!errors.description}
        error={errors.description?.message}
        required
        htmlFor={descriptionId}
        noMargin
      >
        <Input
          {...register('description', { validate: validateKeeperDescription })}
          id={descriptionId}
          aria-required="true"
          aria-invalid={!!errors.description}
        />
      </Field>
    </Stack>
  );
}
