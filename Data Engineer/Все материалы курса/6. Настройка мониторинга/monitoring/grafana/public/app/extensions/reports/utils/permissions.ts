import { contextSrv } from 'app/core/services/context_srv';

import { AccessControlAction } from '../../types';

export const canEditReport =
  contextSrv.hasPermission(AccessControlAction.ReportingWrite) ||
  contextSrv.hasPermission(AccessControlAction.ReportingCreate);
