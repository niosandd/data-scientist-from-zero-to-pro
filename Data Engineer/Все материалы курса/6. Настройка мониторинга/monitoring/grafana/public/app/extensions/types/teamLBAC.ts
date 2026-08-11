export interface TeamLBACState {
  teamLBACConfig: TeamLBACConfig;
  datasourceUid?: string;
}

export interface TeamLBACConfig {
  rules?: TeamRule[];
}

export interface TeamRule {
  teamUid: string;
  rules: string[];
  warning?: string;
}
