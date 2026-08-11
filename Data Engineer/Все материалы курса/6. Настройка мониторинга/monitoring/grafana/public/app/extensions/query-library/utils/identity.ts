import { config } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';
import { AccessControlAction } from 'app/types/accessControl';

export const canEditQuery = (query: SavedQuery) => {
  if (config.featureToggles.savedQueriesRBAC) {
    return hasWritePermissions();
  }

  // this is needed to support previous behavior when RBAC toggle is off
  const userIsAuthor = query.user?.uid?.replace('user:', '') === contextSrv.user.uid;
  const userIsAdmin = contextSrv.hasRole('Admin');

  return (userIsAuthor && contextSrv.isEditor) || userIsAdmin;
};

export const hasWritePermissions = () => {
  return config.featureToggles.savedQueriesRBAC
    ? contextSrv.hasPermission(AccessControlAction.QueriesWrite)
    : contextSrv.isEditor;
};

export const hasReadPermissions = () => {
  return config.featureToggles.savedQueriesRBAC
    ? contextSrv.hasPermission(AccessControlAction.QueriesRead)
    : contextSrv.isSignedIn;
};
