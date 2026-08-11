import { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { t } from '@grafana/i18n';
import { Button, Stack } from '@grafana/ui';

import { type KeeperFormValues } from '../types';

export interface KeeperFormProps {
  defaultValues: KeeperFormValues;
  onSubmit: (data: KeeperFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitText: string;
  isSubmitting?: boolean;
  canSubmit: boolean;
  children: ReactNode;
}

/**
 * Generic keeper form shell. Owns the react-hook-form instance and provides it
 * to children via FormProvider. Renders the <form> tag, submit/cancel buttons,
 * and any provider-specific content passed as children.
 *
 * Provider-specific fields (e.g., AWS region, ARN) are registered by child
 * components using useFormContext — KeeperForm has no provider knowledge.
 */
export function KeeperForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitText,
  isSubmitting = false,
  canSubmit,
  children,
}: KeeperFormProps) {
  const methods = useForm<KeeperFormValues>({ mode: 'onChange', defaultValues });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} data-testid="keeper-form" style={{ maxWidth: 650 }} noValidate>
        <Stack direction="column" gap={2}>
          {children}

          <Stack gap={1} justifyContent="flex-end">
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              {t('secrets-keeper.form.btn-cancel', 'Cancel')}
            </Button>
            <Button disabled={isSubmitting || !canSubmit} type="submit">
              {submitText}
            </Button>
          </Stack>
        </Stack>
      </form>
    </FormProvider>
  );
}
