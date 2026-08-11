import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { GRAFANA_EXTERNAL_ID, KEEPER_DESCRIPTION_MAX_LENGTH, KEEPER_NAME_MAX_LENGTH } from './constants';
import { awsFormValues } from './test-fixtures';
import { buildAwsConfig, formValuesToKeeper, keeperToFormValues, keeperToListItem } from './utils';
import {
  transformKeeperName,
  validateAwsRegion,
  validateKeeperDescription,
  validateKeeperName,
  validateRequired,
  validateRoleArn,
} from './validation';

const createApiKeeper = (name: string, spec: Keeper['spec'], creationTimestamp = '2025-01-01T00:00:00Z'): Keeper =>
  ({
    metadata: { name, creationTimestamp },
    spec,
    status: { active: false },
  }) as Keeper;

describe('keeperToListItem', () => {
  it('converts AWS keeper to list item', () => {
    const keeper = createApiKeeper('aws-test', {
      description: 'Test AWS',
      aws: { region: 'us-east-1' },
    });
    const listItem = keeperToListItem(keeper);

    expect(listItem.name).toBe('aws-test');
    expect(listItem.type).toBe('aws');
    expect(listItem.description).toBe('Test AWS');
    expect(listItem.isActive).toBe(false);
    expect(listItem.config).toBe('us-east-1');
  });

  it('defaults to system type when no provider config is set', () => {
    const keeper = createApiKeeper('system-test', {
      description: 'System keeper',
    });
    const listItem = keeperToListItem(keeper);

    expect(listItem.type).toBe('system');
    expect(listItem.config).toBe('');
  });

  it('preserves creation timestamp', () => {
    const keeper = createApiKeeper('test', {
      description: 'Test',
      aws: { region: 'us-east-1' },
    });
    const listItem = keeperToListItem(keeper);

    expect(listItem.createdAt).toBe('2025-01-01T00:00:00Z');
  });

  it('maps unhandled provider config to unknown type', () => {
    // Simulates a future provider key added to KeeperSpec by backend codegen
    // that the UI hasn't added a branch for yet.
    const keeper = {
      metadata: { name: 'future-test', creationTimestamp: '2025-01-01T00:00:00Z' },
      spec: { description: 'Future keeper', futureProvider: { endpoint: 'https://example.com' } },
      status: {},
    } as unknown as Keeper;
    const listItem = keeperToListItem(keeper);

    expect(listItem.type).toBe('unknown');
    expect(listItem.config).toBe('');
  });

  it('handles missing metadata.name gracefully', () => {
    const keeper = {
      metadata: {},
      spec: { description: 'Test', aws: { region: 'us-east-1' } },
      status: {},
    } as Keeper;
    const listItem = keeperToListItem(keeper);

    expect(listItem.name).toBe('');
  });
});

describe('validateKeeperName', () => {
  it('returns error when empty', () => {
    expect(validateKeeperName('')).toBe('Name is required');
  });

  it('returns error when too long', () => {
    const longName = 'a'.repeat(KEEPER_NAME_MAX_LENGTH + 1);
    expect(validateKeeperName(longName)).toContain('at most');
  });

  it('returns error for invalid characters', () => {
    expect(validateKeeperName('My Keeper!')).toContain('must start and end');
  });

  it('returns error when starts with a dash', () => {
    expect(validateKeeperName('-my-keeper')).toContain('must start and end');
  });

  it('returns error when ends with a dash', () => {
    expect(validateKeeperName('my-keeper-')).toContain('must start and end');
  });

  it('returns error for uppercase characters', () => {
    expect(validateKeeperName('MyKeeper')).toContain('must start and end');
  });

  it('returns true at exactly max length', () => {
    const exactName = 'a'.repeat(KEEPER_NAME_MAX_LENGTH);
    expect(validateKeeperName(exactName)).toBe(true);
  });

  it('returns true for valid names', () => {
    expect(validateKeeperName('my-keeper')).toBe(true);
    expect(validateKeeperName('keeper.prod.1')).toBe(true);
    expect(validateKeeperName('a')).toBe(true);
    expect(validateKeeperName('my--keeper')).toBe(true);
    expect(validateKeeperName('my..keeper')).toBe(true);
  });
});

describe('validateKeeperDescription', () => {
  it('returns error when empty', () => {
    expect(validateKeeperDescription('')).toBe('Description is required');
  });

  it('returns error when too long', () => {
    const longDesc = 'a'.repeat(KEEPER_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateKeeperDescription(longDesc)).toContain('at most');
  });

  it('returns true at exactly max length', () => {
    const exactDesc = 'a'.repeat(KEEPER_DESCRIPTION_MAX_LENGTH);
    expect(validateKeeperDescription(exactDesc)).toBe(true);
  });

  it('returns true for valid descriptions', () => {
    expect(validateKeeperDescription('Production AWS keeper')).toBe(true);
  });
});

describe('validateRequired', () => {
  it('returns error when empty', () => {
    expect(validateRequired('')).toBe('This field is required');
  });

  it('returns error for whitespace-only values', () => {
    expect(validateRequired('   ')).toBe('This field is required');
  });

  it('returns true for non-empty values', () => {
    expect(validateRequired('something')).toBe(true);
  });
});

describe('transformKeeperName', () => {
  it('converts to lowercase', () => {
    expect(transformKeeperName('MyKeeper')).toBe('mykeeper');
  });

  it('replaces spaces with dashes', () => {
    expect(transformKeeperName('my keeper name')).toBe('my-keeper-name');
  });

  it('handles combined transformations', () => {
    expect(transformKeeperName('My Keeper Name')).toBe('my-keeper-name');
  });

  it('converts leading and trailing whitespace to dashes', () => {
    expect(transformKeeperName('  my keeper  ')).toBe('-my-keeper-');
  });

  it('collapses multiple spaces into a single dash', () => {
    expect(transformKeeperName('my   keeper')).toBe('my-keeper');
  });

  it('strips special characters', () => {
    expect(transformKeeperName('my-keeper!')).toBe('my-keeper');
    expect(transformKeeperName('keeper@prod#env')).toBe('keeperprodenv');
  });

  it('handles tabs and newlines as whitespace', () => {
    expect(transformKeeperName('my\tkeeper\nname')).toBe('my-keeper-name');
  });
});

describe('buildAwsConfig', () => {
  it('maps form values to KeeperAwsConfig', () => {
    const config = buildAwsConfig(awsFormValues);

    expect(config.region).toBe('us-east-1');
    expect(config.assumeRole).toEqual({
      assumeRoleArn: 'arn:aws:iam::123456789012:role/my-role',
      externalID: GRAFANA_EXTERNAL_ID,
    });
    expect(config.kmsKeyId).toBe('key-abc');
  });

  it('omits kmsKeyId when empty', () => {
    const config = buildAwsConfig({ ...awsFormValues, awsKmsKeyId: '' });

    expect(config.kmsKeyId).toBeUndefined();
  });
});

describe('validateAwsRegion', () => {
  it('accepts standard regions', () => {
    expect(validateAwsRegion('us-east-1')).toBe(true);
    expect(validateAwsRegion('eu-central-1')).toBe(true);
    expect(validateAwsRegion('ap-southeast-2')).toBe(true);
    expect(validateAwsRegion('sa-east-1')).toBe(true);
  });

  it('accepts GovCloud and China regions', () => {
    expect(validateAwsRegion('us-gov-east-1')).toBe(true);
    expect(validateAwsRegion('cn-north-1')).toBe(true);
  });

  it('rejects empty value', () => {
    expect(validateAwsRegion('')).not.toBe(true);
  });

  it('rejects regions without a digit suffix', () => {
    expect(validateAwsRegion('us-east')).not.toBe(true);
  });

  it('rejects uppercase regions', () => {
    expect(validateAwsRegion('US-EAST-1')).not.toBe(true);
  });

  it('rejects region names with extra segments that look plausible', () => {
    expect(validateAwsRegion('us-east-1-extra')).not.toBe(true);
  });

  it('rejects arbitrary strings', () => {
    expect(validateAwsRegion('not-a-region')).not.toBe(true);
    expect(validateAwsRegion('1234')).not.toBe(true);
  });
});

describe('validateRoleArn', () => {
  it('accepts a standard role ARN', () => {
    expect(validateRoleArn('arn:aws:iam::123456789012:role/MyRole')).toBe(true);
  });

  it('accepts a GovCloud ARN', () => {
    expect(validateRoleArn('arn:aws-us-gov:iam::123456789012:role/MyRole')).toBe(true);
  });

  it('accepts ARNs with a path prefix', () => {
    expect(validateRoleArn('arn:aws:iam::123456789012:role/path/to/MyRole')).toBe(true);
  });

  it('accepts ARNs with valid special chars in role name', () => {
    expect(validateRoleArn('arn:aws:iam::123456789012:role/my.role@domain+ext')).toBe(true);
  });

  it('rejects empty value', () => {
    expect(validateRoleArn('')).not.toBe(true);
  });

  it('rejects ARN with whitespace inside the role name', () => {
    // Space in the middle of the role name is invalid — validator trims the full input
    // but does not strip internal spaces from the path component.
    expect(validateRoleArn('arn:aws:iam::123456789012:role/My Role')).not.toBe(true);
  });

  it('rejects wrong service (not iam)', () => {
    expect(validateRoleArn('arn:aws:sts::123456789012:role/MyRole')).not.toBe(true);
  });

  it('rejects ARN missing role name', () => {
    expect(validateRoleArn('arn:aws:iam::123456789012:role/')).not.toBe(true);
  });

  it('rejects plain strings that look like role names', () => {
    expect(validateRoleArn('MyRole')).not.toBe(true);
    expect(validateRoleArn('not-an-arn')).not.toBe(true);
  });
});

describe('keeperToFormValues', () => {
  it('converts an AWS keeper to form values', () => {
    const keeper = createApiKeeper('aws-prod', {
      description: 'Production keeper',
      aws: {
        region: 'us-east-1',
        assumeRole: {
          assumeRoleArn: 'arn:aws:iam::123456789012:role/MyRole',
          externalID: 'ext-id',
        },
        kmsKeyId: 'key-123',
      },
    });
    const values = keeperToFormValues(keeper);

    expect(values).toEqual({
      type: 'aws',
      name: 'aws-prod',
      description: 'Production keeper',
      awsRegion: 'us-east-1',
      awsAssumeRoleArn: 'arn:aws:iam::123456789012:role/MyRole',
      awsKmsKeyId: 'key-123',
      isActive: false,
    });
  });

  it('defaults optional fields when absent', () => {
    const keeper = createApiKeeper('aws-minimal', {
      description: 'Minimal keeper',
      aws: { region: 'eu-west-1' },
    });
    const values = keeperToFormValues(keeper);
    expect(values).toBeDefined();

    expect(values?.awsAssumeRoleArn).toBe('');
    expect(values?.awsKmsKeyId).toBe('');
  });

  it('returns undefined for non-AWS keepers', () => {
    const keeper = createApiKeeper('system-keeper', { description: 'System' });

    expect(keeperToFormValues(keeper)).toBeUndefined();
  });
});

describe('formValuesToKeeper', () => {
  it('transforms AWS form values to Keeper object', () => {
    const keeper = formValuesToKeeper(awsFormValues);

    expect(keeper.metadata.name).toBe('my-aws-keeper');
    expect(keeper.spec.description).toBe('AWS production keeper');
    expect(keeper.spec.aws).toBeDefined();
    expect(keeper.spec.aws?.region).toBe('us-east-1');
    expect(keeper.spec.aws?.assumeRole?.assumeRoleArn).toBe('arn:aws:iam::123456789012:role/my-role');
    expect(keeper.spec.aws?.assumeRole?.externalID).toBe(GRAFANA_EXTERNAL_ID);
    expect(keeper.spec.aws?.kmsKeyId).toBe('key-abc');
    expect(keeper.status).toEqual({ active: false });
  });

  it('omits kmsKeyId when empty', () => {
    const keeper = formValuesToKeeper({ ...awsFormValues, awsKmsKeyId: '' });

    expect(keeper.spec.aws?.kmsKeyId).toBeUndefined();
  });

  it('reflects isActive in status.active so a PUT does not clobber the active flag', () => {
    const activeKeeper = formValuesToKeeper({ ...awsFormValues, isActive: true });
    expect(activeKeeper.status).toEqual({ active: true });

    const inactiveKeeper = formValuesToKeeper({ ...awsFormValues, isActive: false });
    expect(inactiveKeeper.status).toEqual({ active: false });
  });
});
