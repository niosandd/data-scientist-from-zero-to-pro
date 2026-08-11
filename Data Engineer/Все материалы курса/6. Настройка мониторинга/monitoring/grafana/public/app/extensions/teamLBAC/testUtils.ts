import { type DataSourceSettings } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';

import { type TeamLBACConfig } from '../types';

export const mockTeamLBACConfig: TeamLBACConfig = {
  rules: [
    { teamUid: 'team-1', rules: ['{namespace="prod"}'] },
    { teamUid: 'team-2', rules: ['{cluster="us-east"}'] },
  ],
};

export const mockEmptyTeamLBACConfig: TeamLBACConfig = {
  rules: [],
};

export const mockDataSourceA: DataSourceSettings = {
  id: 1,
  uid: 'datasource-a',
  type: 'loki',
  name: 'Loki A',
  access: 'proxy',
  url: 'http://localhost:3100',
  database: '',
  user: '',
  basicAuth: false,
  basicAuthUser: '',
  withCredentials: false,
  isDefault: false,
  jsonData: {},
  secureJsonFields: {},
  readOnly: false,
  typeLogoUrl: '',
  typeName: 'Loki',
  orgId: 1,
  version: 1,
};

export const mockDataSourceB: DataSourceSettings = {
  ...mockDataSourceA,
  id: 2,
  uid: 'datasource-b',
  name: 'Loki B',
};

export function setupMocks() {
  const mockGet = jest.fn();
  const mockPut = jest.fn();
  const mockBackendSrv = {
    get: mockGet,
    put: mockPut,
    post: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    datasourceRequest: jest.fn(),
  };

  jest.mocked(getBackendSrv).mockReturnValue(mockBackendSrv as any);

  return {
    mockGet,
    mockPut,
    mockBackendSrv,
  };
}
