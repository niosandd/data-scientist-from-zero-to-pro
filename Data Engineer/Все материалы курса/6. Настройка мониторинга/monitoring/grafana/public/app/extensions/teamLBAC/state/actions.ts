import { getBackendSrv } from '@grafana/runtime';
import { type ThunkResult } from 'app/types/store';

import { type TeamLBACConfig } from '../../types';

import { teamLBACLoaded } from './reducers';

export function getTeamLBAC(uid: string): ThunkResult<void> {
  return async (dispatch) => {
    const teamLBACConfig = await getBackendSrv().get(`api/datasources/uid/${uid}/lbac/teams`);
    dispatch(teamLBACLoaded({ config: teamLBACConfig, datasourceUid: uid }));
  };
}

export function updateTeamLBACRules(uid: string, data: TeamLBACConfig): ThunkResult<void> {
  return async (dispatch) => {
    await getBackendSrv().put(`api/datasources/uid/${uid}/lbac/teams`, { ...data });
    dispatch(getTeamLBAC(uid));
  };
}
