import { type FormEvent } from 'react';

import { t } from '@grafana/i18n';
import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import {
  DECRYPT_ALLOW_LIST_LABEL_MAP,
  LABEL_MAX_LENGTH,
  SECURE_VALUE_MAX_LENGTH,
  SUBDOMAIN_MAX_LENGTH,
} from './constants';
import { type FieldErrorMap, type SecretFormValues } from './types';

// Owned secure values (e.g. inline secrets for a Setting) are managed by their controller and should be hidden from user-facing lists.
export function hasOwnerReference(secureValue: SecureValue): boolean {
  return (secureValue.metadata.ownerReferences?.length ?? 0) > 0;
}

export function secureValueForForm(secureValue?: SecureValue): SecretFormValues | undefined {
  if (typeof secureValue === 'undefined' || !secureValue.metadata.name) {
    return undefined;
  }

  return {
    name: secureValue.metadata.name,
    description: secureValue.spec.description,
    decrypters:
      secureValue.spec.decrypters?.map((decrypter) => {
        if (decrypter in DECRYPT_ALLOW_LIST_LABEL_MAP) {
          return { label: DECRYPT_ALLOW_LIST_LABEL_MAP[decrypter], value: decrypter };
        }

        return { label: `Unsupported (${decrypter})`, value: decrypter };
      }) ?? [],
    labels: Object.entries(secureValue.metadata.labels ?? []).map(([name, value]) => ({ name, value })),
  };
}

export function validateSecretName(value: string): true | string {
  if (value.length < 1) {
    return t('secrets.form.name.error.required', 'Name is required');
  }

  if (value.length > SUBDOMAIN_MAX_LENGTH) {
    return t('secrets.form.name.error.too-long', 'Name must be less than {{maxLength}} characters', {
      maxLength: SUBDOMAIN_MAX_LENGTH,
    });
  }

  if (!RegExp(/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/).test(value)) {
    return t(
      'secrets.form.name.error.invalid',
      'Name must start and end with a letter or number and can only contain letters, numbers, dashes, and periods'
    );
  }

  return true;
}

export function validateSecretDescription(value: string): true | string {
  if (value.length < 1) {
    return t('secrets.form.description.error.required', 'Description is required');
  }

  if (value.length > SUBDOMAIN_MAX_LENGTH) {
    return t('secrets.form.description.error.too-long', 'Description must be less than {{maxLength}} characters', {
      maxLength: SUBDOMAIN_MAX_LENGTH,
    });
  }

  return true;
}

export function validateSecretValue(value: string | undefined): true | string {
  if (value === undefined) {
    // The assumption is that the value is already set and that the secret is being updated without changing the value
    return true;
  }

  if (value.length < 1) {
    return t('secrets.form.value.error.required', 'Value is required');
  }

  if (value.length > SECURE_VALUE_MAX_LENGTH) {
    return t('secrets.form.value.error.too-long', 'Value must be less than {{maxLength}} characters', {
      maxLength: SECURE_VALUE_MAX_LENGTH,
    });
  }

  return true;
}

export function validateSecretLabel(key: 'name' | 'value', nameOrValue: string): true | string {
  if (nameOrValue.length < 1) {
    return key === 'name'
      ? t('secrets.form.label-name.error.required', 'Label name is required')
      : t('secrets.form.label-value.error.required', 'Label value is required');
  }

  if (nameOrValue.length > LABEL_MAX_LENGTH) {
    const transValues = {
      maxLength: LABEL_MAX_LENGTH,
    };
    return key === 'name'
      ? t(
          'secrets.form.label-name.error.too-long',
          'Label name must be less than {{maxLength}} characters',
          transValues
        )
      : t(
          'secrets.form.label-value.error.too-long',
          'Label value must be less than {{maxLength}} characters',
          transValues
        );
  }

  if (!RegExp(/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/).test(nameOrValue)) {
    return key === 'name'
      ? t(
          'secrets.form.label-name.error.invalid',
          'Label name must start and end with a letter or number and can only contain letters, numbers, dashes, underscores, and periods'
        )
      : t(
          'secrets.form.label-value.error.invalid',
          'Label value must start and end with a letter or number and can only contain letters, numbers, dashes, underscores, and periods'
        );
  }

  return true;
}

export function checkLabelNameAvailability(
  name: string,
  index: number,
  { labels }: Pick<SecretFormValues, 'labels'>
): true | string {
  const validation = validateSecretLabel('name', name);
  if (validation !== true) {
    return validation;
  }

  // Only check against label names before the current label
  if (labels?.slice(0, index).some((subject) => subject.name === name)) {
    return t('secrets.form.label-name.error.unique', 'Label name must be unique');
  }

  return true;
}

/**
 * Persists the cursor position in the input field when the value is transformed.
 * This is useful when the value is transformed (e.g., to lowercase) and the cursor position is lost (moved to end).
 *
 * @param {FormEvent<HTMLInputElement | HTMLTextAreaElement>} event Input/Textarea event
 * @param {(value: string) => string} transformationFunction Function to transform the value
 * @param {(value: string) => void} onTransformedHandler Function to handle the transformed value
 */
export function onChangeTransformation(
  event: Pick<FormEvent<HTMLInputElement | HTMLTextAreaElement>, 'currentTarget'>,
  transformationFunction: (value: string) => string,
  onTransformedHandler: (value: string) => void
): void {
  const selectionStart = event?.currentTarget?.selectionStart ?? null;
  const value = event.currentTarget.value;
  const transformedValue = transformationFunction(value);

  onTransformedHandler(transformedValue);
  event?.currentTarget?.setSelectionRange?.(selectionStart, selectionStart);
}

/**
 * Transforms the secret name to lowercase and replaces spaces with dashes, to make it a bit more user-friendly.
 * @param {string} value
 */
export function transformSecretName(value: string): string {
  return value.toLowerCase().replaceAll(' ', '-');
}

/**
 * Transforms the secret label (name|value) by replacing spaces with dashes, to make it a bit more user-friendly.
 * @param nameOrValue
 */
export function transformSecretLabel(nameOrValue: string): string {
  return nameOrValue.replaceAll(' ', '-');
}

/**
 * Returns whether a field key exists in errors map created by `react-hook-form (meaning, it's an invalid field)
 * @param {string} fieldName - Name of field to lookup
 * @param {Object} errors - Error map
 */
export function isFieldInvalid(fieldName: string, errors: Record<string, { message?: string } | undefined>) {
  return fieldName in errors ? true : undefined;
}

export function getErrorMessage(error: unknown) {
  const fallback = t('secrets.error-state.unknown-error', 'Unknown error');
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    if (
      'data' in error &&
      error.data &&
      typeof error.data === 'object' &&
      'message' in error.data &&
      typeof error.data.message === 'string'
    ) {
      return error.data.message;
    }
  }

  return fallback;
}

export function getFieldErrors(error: unknown): FieldErrorMap | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    const { message } = error.data;

    if (/secure value already exists/.test(message)) {
      return { name: { message: t('secrets.form.name.error.unique', 'A secret with this name already exists') } };
    }
  }

  return undefined;
}
