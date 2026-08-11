import { type DataSourceCacheState } from '../../types';

import { type Action, ActionTypes } from './actions';

const initialState: DataSourceCacheState = {
  enabled: false,
  dataSourceID: 0,
  dataSourceUID: '',
  ttlQueriesMs: 0,
  ttlResourcesMs: 0,
  defaultTTLMs: 0,
  useDefaultTTL: true,
};

const dataSourceCacheReducer = (state = initialState, action: Action): DataSourceCacheState => {
  switch (action.type) {
    case ActionTypes.LoadDataSourceCache:
      return {
        ...action.payload,
      };
  }

  return state;
};

export default {
  dataSourceCache: dataSourceCacheReducer,
};
