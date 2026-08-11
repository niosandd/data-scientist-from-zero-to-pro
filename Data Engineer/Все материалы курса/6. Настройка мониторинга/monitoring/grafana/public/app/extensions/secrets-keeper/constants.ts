import { t } from '@grafana/i18n';

import awsSecretsManagerLogo from './assets/aws-secrets-manager.svg';
import { type KeeperFormValues, type KeeperProvider } from './types';

export const SECRETS_KEEPER_BASE_URL = '/admin/secrets/keepers';
export const SECRETS_KEEPER_NEW_URL = `${SECRETS_KEEPER_BASE_URL}/new`;

// Well-known name of the virtual system keeper. Matches the backend constant
// at pkg/registry/apis/secret/contracts/keeper.go. Activating this name via
// POST /keepers/system/activate is the canonical "deactivate" path.
export const SYSTEM_KEEPER_NAME = 'system';

export const getCreateKeeperUrl = (type: KeeperFormValues['type']) => `${SECRETS_KEEPER_NEW_URL}/${type}`;
export const getEditKeeperUrl = (name: string) => `${SECRETS_KEEPER_BASE_URL}/${name}/edit`;

// RFC 1123 hostname: lowercase alphanumeric, dashes, and periods.
// Must start and end with alphanumeric. Max 253 chars.
export const KEEPER_NAME_MAX_LENGTH = 253;
// TODO: Verify description max length against backend schema — 253 may be a copy-paste from name.
export const KEEPER_DESCRIPTION_MAX_LENGTH = 253;
export const KEEPER_NAME_PATTERN = /^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/;

// IAM resource names shown in the keeper setup instructions.
export const IAM_POLICY_NAME = 'GrafanaSecretsManagerPolicy';
// Grafana's keeper backend is configured to only assume a role with this exact name.
export const IAM_ROLE_NAME = 'grafana-secrets-manager';

// Grafana's AWS account ID used in IAM trust relationships for keeper setup.
export const GRAFANA_ACCOUNT_ID = '008923505280';
// External ID used in the assume role trust condition (prevents confused deputy attacks).
// Shown to users in the keeper setup instructions to configure in their AWS IAM role.
// TODO: Replace with instance-specific value from API when available.
export const GRAFANA_EXTERNAL_ID = 'grafana-ext-a1b2c3d4e5f6';

export const getKeeperProviders = (): KeeperProvider[] => [
  {
    id: 'aws',
    name: t('secrets-keeper.provider.aws.name', 'AWS Secrets Manager'),
    description: t(
      'secrets-keeper.provider.aws.description',
      'Store and manage secrets using Amazon Web Services Secrets Manager with IAM role-based authentication.'
    ),
    logoSrc: awsSecretsManagerLogo,
    tags: ['AWS', 'Cloud', 'IAM'],
  },
];
