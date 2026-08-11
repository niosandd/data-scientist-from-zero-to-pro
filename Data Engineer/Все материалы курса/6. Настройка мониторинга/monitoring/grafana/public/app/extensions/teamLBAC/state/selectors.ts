import { createSelectorCreator, lruMemoize } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';

import { type EnterpriseStoreState, type TeamRule } from '../../types';

// Create a selector creator that uses deep equality checking
// This ensures selectors return stable references when content is deeply equal,
// preventing unnecessary re-renders even when Redux state creates new object references
const createDeepEqualSelector = createSelectorCreator(lruMemoize, isEqual);

export const selectTeamLBACRules = createDeepEqualSelector(
  (state: EnterpriseStoreState) => state.teamLBAC?.teamLBACConfig?.rules,
  (rules): TeamRule[] => {
    // Create shallow copy to satisfy Redux Toolkit dev check while maintaining deep equality benefits
    return rules ? [...rules] : [];
  }
);

export const selectTeamLBACDatasourceUid = (state: EnterpriseStoreState) => {
  return state.teamLBAC?.datasourceUid;
};
