// Thresholds for license limits, in percents
export const WARNING_RATE = 80;
export const ERROR_RATE = 100;

// these mirror the definition in types.go
export const VALID = 1;
export const EXPIRED = 5;

export const DISMISS_WARNING_FOR_DAYS = 5;
/* The auto dismiss cannot be too low as it will also trigger the snooze */
export const WARNING_CLOSE_TIMEOUT_SEC = 3600;
export const LICENSE_WARNING_DISMISS_UNTIL_KEY = 'grafana.licence.warning.dismissUntil';

export const LIMIT_BY_USERS = 'users';

export const AWS_MARKEPLACE_ISSUER = 'AWS/Marketplace';
