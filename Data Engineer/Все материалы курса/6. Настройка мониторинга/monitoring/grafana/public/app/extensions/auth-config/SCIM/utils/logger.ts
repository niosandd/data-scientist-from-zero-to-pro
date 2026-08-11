import { type LogContext } from '@grafana/faro-web-sdk';
import { getLogger } from '@grafana/runtime/unstable';

// Shared structured logging for SCIM operations
export const logInfo = (message: string, contexts?: LogContext) =>
  getLogger('extensions.auth-config.scim').logInfo(message, contexts);

export const logWarning = (message: string, contexts?: LogContext) =>
  getLogger('extensions.auth-config.scim').logWarning(message, contexts);

export const logError = (error: Error, contexts?: LogContext) =>
  getLogger('extensions.auth-config.scim').logError(error, contexts);

export const logMeasurement = (type: string, measurement: Record<string, number>, contexts?: LogContext) =>
  getLogger('extensions.auth-config.scim').logMeasurement(type, measurement, contexts);
