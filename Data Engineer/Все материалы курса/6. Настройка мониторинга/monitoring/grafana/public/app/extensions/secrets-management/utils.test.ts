import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { LABEL_MAX_LENGTH, SUBDOMAIN_MAX_LENGTH } from './constants';
import {
  checkLabelNameAvailability,
  getErrorMessage,
  getFieldErrors,
  hasOwnerReference,
  isFieldInvalid,
  transformSecretLabel,
  transformSecretName,
  validateSecretDescription,
  validateSecretLabel,
  validateSecretName,
  validateSecretValue,
} from './utils';

function makeSecureValue(overrides: Partial<SecureValue['metadata']> = {}): SecureValue {
  return {
    metadata: { name: 'test-secret', ...overrides },
    spec: { description: 'test description' },
    status: { keeper: 'system' },
  };
}

afterAll(() => {
  jest.restoreAllMocks();
});

beforeAll(() => {
  jest.restoreAllMocks();
});

describe('validateSecretName', () => {
  it.each([['secret-name'], ['1-secret-name'], ['secret.name-1'], ['secret.name-1'], ['1'], ['a']])(
    'should return true (%s)',
    (name) => {
      expect(validateSecretName(name)).toBe(true);
    }
  );

  it.each([['Secret-name'], ['-1-secret-name'], ['secret name-1'], ['&'], ['']])(
    'should return error message (%s)',
    (name) => {
      expect(validateSecretName(name)).not.toBe(true);
    }
  );

  it('should enforce max length', () => {
    const valid = new Array(SUBDOMAIN_MAX_LENGTH).fill('a').join('');
    const invalid = new Array(SUBDOMAIN_MAX_LENGTH + 1).fill('a').join('');

    expect(validateSecretName(valid)).toBe(true);
    expect(validateSecretName(invalid)).not.toBe(true);
  });
});

describe('validateSecretDescription', () => {
  it.each([['Hello World'], ['123'], ['Hello World!?']])('should return true (%s)', (description) => {
    expect(validateSecretDescription(description)).toBe(true);
  });

  it('should return error message', () => {
    expect(validateSecretDescription('')).not.toBe(true);
  });

  it('should enforce max length', () => {
    const valid = new Array(SUBDOMAIN_MAX_LENGTH).fill('a').join('');
    const invalid = new Array(SUBDOMAIN_MAX_LENGTH + 1).fill('a').join('');

    expect(validateSecretDescription(valid)).toBe(true);
    expect(validateSecretDescription(invalid)).not.toBe(true);
  });
});

describe('validateSecretValue', () => {
  it('should not be empty', () => {
    expect(validateSecretValue('')).not.toBe(true);
  });
});

describe('validateSecretLabel', () => {
  it.each([['valid'], ['1valid'], ['Valid'], ['Valid.label-name__or__value']])('should return true (%s)', (value) => {
    expect(validateSecretLabel('name', value)).toBe(true);
    expect(validateSecretLabel('value', value)).toBe(true);
  });

  it.each(['-invalid', '_invalid', '.invalid', 'my invalid', 'invalid!'])(
    'should return error message (%s)',
    (value) => {
      expect(validateSecretLabel('name', value)).not.toBe(true);
      expect(validateSecretLabel('value', value)).not.toBe(true);
    }
  );

  it('should enforce max length', () => {
    const valid = new Array(LABEL_MAX_LENGTH).fill('a').join('');
    const invalid = new Array(LABEL_MAX_LENGTH + 1).fill('a').join('');

    expect(validateSecretLabel('name', valid)).toBe(true);
    expect(validateSecretLabel('value', valid)).toBe(true);
    expect(validateSecretLabel('name', invalid)).not.toBe(true);
    expect(validateSecretLabel('value', invalid)).not.toBe(true);
  });
});

describe('checkLabelNameAvailability', () => {
  const labels = [
    { name: 'a', value: 'a' },
    { name: 'b', value: 'b' },
  ];

  it('should return true', () => {
    // First instance of a name is truthy
    expect(checkLabelNameAvailability('a', 0, { labels })).toBe(true);
    expect(checkLabelNameAvailability('b', 1, { labels })).toBe(true);
    expect(checkLabelNameAvailability('c', 2, { labels })).toBe(true);
  });

  it('should return error message', () => {
    expect(checkLabelNameAvailability('a', 2, { labels })).not.toBe(true);
    expect(checkLabelNameAvailability('b', 2, { labels })).not.toBe(true);
  });
});

describe('transformSecretName', () => {
  it('should transform all spaces', () => {
    expect(transformSecretName('my secret name')).toBe('my-secret-name');
  });

  it('should lowercase value', () => {
    expect(transformSecretName('My-Secret-Name')).toBe('my-secret-name');
  });
});

describe('transformSecretLabel', () => {
  it('should transform all spaces', () => {
    expect(transformSecretLabel('my label value')).toBe('my-label-value');
  });

  it('should NOT lowercase value', () => {
    expect(transformSecretLabel('My-Label-Value')).toBe('My-Label-Value');
  });
});

describe('isFieldInvalid', () => {
  it('should return true', () => {
    expect(isFieldInvalid('invalid', { invalid: { message: '' } })).toBe(true);
  });

  it('should return undefined', () => {
    expect(isFieldInvalid('valid', { invalid: { message: '' } })).toBe(undefined);
  });
});

describe('getErrorMessage', () => {
  const fallbackMessage = 'Unknown error';
  it.each([
    ['{  }', {}, fallbackMessage],
    ['{ message: {} }', { message: {} }, fallbackMessage],
    ['{ message: string}', { message: 'TEST_ERROR' }, 'TEST_ERROR'],
    ['{ message: { error: string }', { message: { error: 'TEST_ERROR' } }, fallbackMessage],
    ['{ message: null}', { message: null }, fallbackMessage],
    ['null', null, fallbackMessage],
    ['1', 1, fallbackMessage],
    ['undefined', undefined, fallbackMessage],
    [
      'Function',
      function testError() {
        return 'TEST_ERROR';
      },
      fallbackMessage,
    ],
    ['{data: {message: string}}', { data: { message: 'TEST_ERROR' } }, 'TEST_ERROR'],
    ['{data: {message: null}}', { data: { message: null } }, fallbackMessage],
    ['{data: {message: 1}}', { data: { message: 1 } }, fallbackMessage],
    ['{data: {}}', { data: {} }, fallbackMessage],
    ['{data: null}', { data: {} }, fallbackMessage],
  ])('should return an error message from `%s`', (description, subject, expected) => {
    expect(getErrorMessage(subject)).toBe(expected);
  });
});

describe('hasOwnerReference', () => {
  it('should return false when ownerReferences is undefined', () => {
    expect(hasOwnerReference(makeSecureValue())).toBe(false);
  });

  it('should return false when ownerReferences is empty', () => {
    expect(hasOwnerReference(makeSecureValue({ ownerReferences: [] }))).toBe(false);
  });

  it('should return true when ownerReferences has at least one entry', () => {
    const secureValue = makeSecureValue({
      ownerReferences: [
        {
          apiVersion: 'setting.grafana.app/v1beta1',
          kind: 'Setting',
          name: 'remote.ruler--ruler-password',
          uid: '',
        },
      ],
    });
    expect(hasOwnerReference(secureValue)).toBe(true);
  });
});

describe('getFieldErrors', () => {
  it('should detect error message when secret name already exists', () => {
    const error = {
      data: {
        message:
          'creating secure value failed to create securevalue: db failure: namespace=default name=some-secret-name secure value already exists',
      },
    };
    expect(getFieldErrors(error)).toStrictEqual({
      name: {
        message: 'A secret with this name already exists',
      },
    });
  });

  it('should return undefined when no match is found', () => {
    const error = {
      data: {
        message:
          'creating secure value failed to create securevalue: db failure: namespace=default name=some-secret-name some new error',
      },
    };
    expect(getFieldErrors(error)).toBeUndefined();
  });
});
