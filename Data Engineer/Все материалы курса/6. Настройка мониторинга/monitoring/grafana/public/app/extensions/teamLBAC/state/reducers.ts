import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

import { type TeamLBACConfig, type TeamLBACState, type TeamRule } from '../../types';

const initialState: TeamLBACState = {
  teamLBACConfig: { rules: [] as TeamRule[] },
};

const teamLBACSlice = createSlice({
  name: 'teamLBAC',
  initialState,
  reducers: {
    teamLBACLoaded: (
      state: TeamLBACState,
      action: PayloadAction<{ config: TeamLBACConfig; datasourceUid: string }>
    ): TeamLBACState => ({
      ...state,
      teamLBACConfig: action.payload.config,
      datasourceUid: action.payload.datasourceUid,
    }),
  },
});

export const { teamLBACLoaded } = teamLBACSlice.actions;

const reducer = teamLBACSlice.reducer;

export const teamLBACReducer = {
  teamLBAC: reducer,
};
