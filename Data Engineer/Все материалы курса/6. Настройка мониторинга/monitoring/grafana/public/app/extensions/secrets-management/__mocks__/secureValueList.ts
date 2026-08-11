import { type SecureValue } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { DECRYPT_ALLOW_LIST_LABEL_MAP } from '../constants';

export const secureValueList: SecureValue[] = [
  {
    metadata: {
      name: 'mocked-test-secret-1',
      labels: {
        'mocked-label-name-1': 'mocked-label-value-1',
        'mocked-label-name-2': 'mocked-label-value-2',
      },
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      description: 'mocked secret description-1',
      decrypters: Object.keys(DECRYPT_ALLOW_LIST_LABEL_MAP),
      // This secret must not have a keeper!
    },
    status: {
      keeper: 'system',
    },
  },
  {
    metadata: {
      name: 'mocked-test-secret-2',
      labels: {
        'mocked-label-name-1': 'mocked-label-value-1',
        'mocked-label-name-2': 'mocked-label-value-2',
      },
      creationTimestamp: new Date().toISOString(),
    },
    spec: {
      description: 'mocked secret description-1',
      decrypters: Object.keys(DECRYPT_ALLOW_LIST_LABEL_MAP),
    },
    status: {
      keeper: 'system',
    },
  },
  {
    metadata: {
      name: 'mocked-test-secret-owned',
      creationTimestamp: new Date().toISOString(),
      ownerReferences: [
        {
          apiVersion: 'setting.grafana.app/v1beta1',
          kind: 'Setting',
          name: 'remote.ruler--ruler-password',
          uid: '',
        },
      ],
    },
    spec: {
      description: 'mocked owned secret',
      decrypters: ['setting.grafana.app'],
    },
    status: {
      keeper: 'system',
    },
  },
];
