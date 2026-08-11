import { type StoreState } from 'app/types/store';

import { type SAMLConfigState } from './authConfig';
import { type DataSourceCacheState } from './caching';
import { type MetaAnalyticsState } from './metaanalytics';
import { type DataSourcePermissionState } from './permissions';
import { type RecordedQueriesState } from './recordedQuery';
import { type ReportsState } from './reports';
import { type SCIMConfigState } from './scimConfig';
import { type TeamLBACState } from './teamLBAC';

export interface EnterpriseStoreState extends StoreState {
  dataSourcePermission: DataSourcePermissionState;
  dataSourceCache: DataSourceCacheState;
  reports: ReportsState;
  metaAnalytics: MetaAnalyticsState;
  recordedQueries: RecordedQueriesState;
  samlConfig: SAMLConfigState;
  scimConfig: SCIMConfigState;
  teamLBAC: TeamLBACState;
}
