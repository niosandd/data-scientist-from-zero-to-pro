import { getBackendSrv } from 'app/core/services/backend_srv';
import { type ThunkResult } from 'app/types/store';

import { type DataSourceCacheDTO } from '../../types';

export enum ActionTypes {
  LoadDataSourceCache = 'LOAD_DATA_SOURCE_CACHE',
}

interface LoadDataSourceCacheAction {
  type: ActionTypes.LoadDataSourceCache;
  payload: DataSourceCacheDTO;
}

const dataSourceCacheLoaded = (dataSourceCache: DataSourceCacheDTO): LoadDataSourceCacheAction => ({
  type: ActionTypes.LoadDataSourceCache,
  payload: dataSourceCache,
});

export type Action = LoadDataSourceCacheAction;

export function enableDataSourceCache(uid: string, dataSourceType: string): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().post(
      `/api/datasources/${uid}/cache/enable?dataSourceType=${dataSourceType}`,
      {}
    );
    dispatch(dataSourceCacheLoaded(response));
  };
}

export function disableDataSourceCache(uid: string, dataSourceType: string): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().post(
      `/api/datasources/${uid}/cache/disable?dataSourceType=${dataSourceType}`,
      {}
    );
    dispatch(dataSourceCacheLoaded(response));
  };
}

export function updateDataSourceCache(
  uid: string,
  dataSourceType: string,
  config: DataSourceCacheDTO
): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().post(
      `/api/datasources/${uid}/cache?dataSourceType=${dataSourceType}`,
      config
    );
    dispatch(dataSourceCacheLoaded(response));
  };
}

export function loadDataSourceCache(uid: string, dataSourceType: string): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().get(`/api/datasources/${uid}/cache?dataSourceType=${dataSourceType}`, {});
    dispatch(dataSourceCacheLoaded(response));
  };
}

export function cleanCache(uid: string): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().post(`/api/datasources/${uid}/cache/clean`, {});
    dispatch(dataSourceCacheLoaded(response));
  };
}
