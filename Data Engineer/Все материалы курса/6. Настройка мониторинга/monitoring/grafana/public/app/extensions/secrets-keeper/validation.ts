import { t } from '@grafana/i18n';

import { KEEPER_DESCRIPTION_MAX_LENGTH, KEEPER_NAME_MAX_LENGTH, KEEPER_NAME_PATTERN } from './constants';

export function validateKeeperName(value: string): true | string {
  if (value.length < 1) {
    return t('secrets-keeper.form.name.error.required', 'Name is required');
  }

  if (value.length > KEEPER_NAME_MAX_LENGTH) {
    return t('secrets-keeper.form.name.error.too-long', 'Name must be at most {{maxLength}} characters', {
      maxLength: KEEPER_NAME_MAX_LENGTH,
    });
  }

  if (!KEEPER_NAME_PATTERN.test(value)) {
    return t(
      'secrets-keeper.form.name.error.invalid',
      'Name must start and end with a letter or number and can only contain letters, numbers, dashes, and periods'
    );
  }

  return true;
}

export function validateKeeperDescription(value: string): true | string {
  if (value.length < 1) {
    return t('secrets-keeper.form.description.error.required', 'Description is required');
  }

  if (value.length > KEEPER_DESCRIPTION_MAX_LENGTH) {
    return t('secrets-keeper.form.description.error.too-long', 'Description must be at most {{maxLength}} characters', {
      maxLength: KEEPER_DESCRIPTION_MAX_LENGTH,
    });
  }

  return true;
}

export function validateRequired(value: string): true | string {
  if (!value.trim()) {
    return t('secrets-keeper.form.error.required', 'This field is required');
  }

  return true;
}

// Matches standard AWS regions: us-east-1, eu-central-1, ap-southeast-2, etc.
// Also covers GovCloud (us-gov-east-1) and China (cn-north-1).
const AWS_REGION_PATTERN = /^[a-z]{2,}(-[a-z]+)+-\d+$/;

// Matches standard and GovCloud IAM role ARNs.
// Path component allows valid IAM chars: alphanumeric, +, =, , . @ _ - and / for nested paths.
// No whitespace or other special chars permitted after the role prefix.
// Examples: arn:aws:iam::123456789012:role/RoleName
//           arn:aws-us-gov:iam::123456789012:role/path/to/RoleName
const AWS_ROLE_ARN_PATTERN = /^arn:aws[^:]*:iam::[0-9]{12}:role\/[\w+=,.@\-/]+$/;

export function validateAwsRegion(value: string): true | string {
  if (!value.trim()) {
    return t('secrets-keeper.form.error.required', 'This field is required');
  }

  if (!AWS_REGION_PATTERN.test(value.trim())) {
    return t('secrets-keeper.form.aws-region.error.invalid', 'Enter a valid AWS region (e.g., us-east-1)');
  }

  return true;
}

export function validateRoleArn(value: string): true | string {
  if (!value.trim()) {
    return t('secrets-keeper.form.error.required', 'This field is required');
  }

  if (!AWS_ROLE_ARN_PATTERN.test(value.trim())) {
    return t(
      'secrets-keeper.form.aws-arn.error.invalid',
      'Enter a valid IAM role ARN (e.g., arn:aws:iam::123456789012:role/RoleName)'
    );
  }

  return true;
}

/**
 * Transforms user input toward a valid K8s-compatible keeper name:
 * lowercase, strips invalid characters, collapses whitespace runs into single dashes.
 * Note: Does NOT trim leading/trailing dashes — validation catches those so the user
 * gets feedback while typing (e.g., a trailing space shows as a dash, then disappears
 * once the next character is typed).
 */
export function transformKeeperName(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s\-.]/g, '')
    .replaceAll(/\s+/g, '-');
}
