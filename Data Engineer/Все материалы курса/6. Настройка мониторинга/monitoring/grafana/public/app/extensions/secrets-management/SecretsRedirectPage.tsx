import { Navigate } from 'react-router-dom-v5-compat';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

/**
 * Redirect page for /admin/secrets.
 *
 * Routes users to the appropriate sub-page based on their permissions:
 * - SecureValues permissions → /admin/secrets/secure-values (priority)
 * - Keepers permissions → /admin/secrets/keepers
 * - Neither → / (fallback — route guard should prevent reaching here)
 */
export default function SecretsRedirectPage() {
  const hasSecureValuesAccess =
    contextSrv.hasPermission(AccessControlAction.SecretSecureValuesRead) ||
    contextSrv.hasPermission(AccessControlAction.SecretSecureValuesCreate);

  if (hasSecureValuesAccess) {
    return <Navigate replace to="/admin/secrets/secure-values" />;
  }

  const hasKeepersAccess =
    contextSrv.hasPermission(AccessControlAction.SecretKeepersRead) ||
    contextSrv.hasPermission(AccessControlAction.SecretKeepersCreate);

  if (hasKeepersAccess) {
    return <Navigate replace to="/admin/secrets/keepers" />;
  }

  // Fallback — route guard should prevent reaching here
  return <Navigate replace to="/" />;
}
