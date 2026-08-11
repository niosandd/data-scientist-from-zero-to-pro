import {
  type Keeper,
  type KeeperAwsConfig,
  type KeeperSpec,
} from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { GRAFANA_EXTERNAL_ID } from './constants';
import { type AwsKeeperFormValues, type KeeperFormValues, type KeeperListItem, type KeeperType } from './types';

// All KeeperSpec keys we explicitly handle (providers + metadata fields).
// If codegen adds a new key and we haven't added a branch for it,
// hasUnhandledSpecKey will catch it and map to 'unknown'.
const HANDLED_SPEC_KEYS: ReadonlySet<string> = new Set<keyof KeeperSpec>(['description', 'aws']);

function hasUnhandledSpecKey(spec: KeeperSpec): boolean {
  return Object.keys(spec).some((key) => !HANDLED_SPEC_KEYS.has(key) && spec[key as keyof KeeperSpec] != null);
}

export const keeperToListItem = (keeper: Keeper): KeeperListItem => {
  let type: KeeperType = 'system';
  let config = '';

  if (keeper.spec.aws) {
    type = 'aws';
    config = keeper.spec.aws.region;
  } else if (hasUnhandledSpecKey(keeper.spec)) {
    type = 'unknown';
  }

  return {
    name: keeper.metadata.name ?? '',
    type,
    description: keeper.spec.description,
    isActive: keeper.status.active,
    createdAt: keeper.metadata.creationTimestamp,
    config,
  };
};

export function buildAwsConfig(values: AwsKeeperFormValues): KeeperAwsConfig {
  const awsConfig: KeeperAwsConfig = {
    region: values.awsRegion,
    assumeRole: {
      assumeRoleArn: values.awsAssumeRoleArn,
      externalID: GRAFANA_EXTERNAL_ID,
    },
  };

  if (values.awsKmsKeyId) {
    awsConfig.kmsKeyId = values.awsKmsKeyId;
  }

  return awsConfig;
}

export function keeperToFormValues(keeper: Keeper): KeeperFormValues | undefined {
  if (!keeper.spec.aws) {
    return undefined;
  }

  return {
    type: 'aws',
    name: keeper.metadata.name ?? '',
    description: keeper.spec.description,
    awsRegion: keeper.spec.aws.region,
    awsAssumeRoleArn: keeper.spec.aws.assumeRole?.assumeRoleArn ?? '',
    awsKmsKeyId: keeper.spec.aws.kmsKeyId ?? '',
    isActive: keeper.status.active,
  };
}

export function formValuesToKeeper(values: KeeperFormValues): Keeper {
  // Reflect the form's view of `isActive` in `status.active` so a PUT during
  // edit-save does not clobber the BE's active flag. `keeperToFormValues`
  // seeds `isActive` from `keeper.status.active`, so on an unchanged toggle
  // this round-trips the existing state; on a changed toggle it matches the
  // user's intent (the activate endpoint is still the canonical state-change
  // path — handleSubmit calls it separately when the toggle moves).
  const keeper: Keeper = {
    metadata: {
      name: values.name,
    },
    spec: {
      description: values.description,
    },
    status: { active: values.isActive },
  };

  if (values.type === 'aws') {
    keeper.spec.aws = buildAwsConfig(values);
  }

  return keeper;
}
