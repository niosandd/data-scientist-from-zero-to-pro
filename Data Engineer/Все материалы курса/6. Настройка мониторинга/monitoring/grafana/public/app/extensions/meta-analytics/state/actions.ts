import { type ThunkResult } from 'app/types/store';

import { type AnalyticsTab } from '../../types';

import { setDrawerOpen, setDrawerTab } from './reducers';

export function openDrawer(tab: AnalyticsTab): ThunkResult<void> {
  return (dispatch) => {
    dispatch(setDrawerOpen(true));
    dispatch(setDrawerTab(tab));
  };
}
