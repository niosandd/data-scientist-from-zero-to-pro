// UI-specific types for Secrets Keeper
// API types (Keeper, KeeperSpec, etc.) come from the generated client:
// app/extensions/api/clients/secret/v1beta1/endpoints.gen

// Matches the provider config keys on KeeperSpec (apps/secret/pkg/apis/secret/v1beta1).
// 'system' is the default when no provider config is set (Grafana-managed storage).
// 'unknown' is a fallback for provider types added to the backend but not yet handled in the UI.
export type KeeperType = 'aws' | 'system' | 'unknown';

export interface KeeperProvider {
  id: KeeperType;
  name: string;
  description: string;
  logoSrc: string;
  tags: string[];
}

// UI-specific keeper with computed fields for display
export interface KeeperListItem {
  name: string;
  type: KeeperType;
  description: string;
  isActive: boolean;
  createdAt?: string;
  // For display purposes, e.g., "us-east-1" for AWS
  config: string;
}

// Shared form values for all keeper types
export interface KeeperFormValuesBase {
  name: string;
  description: string;
}

// AWS-specific form values
export interface AwsKeeperFormValues extends KeeperFormValuesBase {
  type: 'aws';
  awsRegion: string;
  awsAssumeRoleArn: string;
  awsKmsKeyId: string;
  // Whether this keeper should be the active keeper in its namespace.
  // The detail page exposes this as a toggle so saving can update both
  // configuration and active-keeper selection in a single submit. The Create
  // flow always sends false (the user can't pre-activate a keeper before it
  // exists). Excluded from the API request body — the activate endpoint is
  // a separate call.
  isActive: boolean;
}

// Union of all creatable keeper form values.
// Extend this union when adding new providers.
export type KeeperFormValues = AwsKeeperFormValues;

// ── Instruction section types (shared across provider instruction sets) ──

// Each provider's instruction wizard has numbered sections (e.g., 1-4 for AWS).
export type SectionNumber = 1 | 2 | 3 | 4;
export type SectionOpenState = Record<SectionNumber, boolean>;

// Props shared by all instruction section components (sections 1-3).
// Terminal sections (e.g., section 4 with form fields) use Omit<..., 'onContinue'>.
export interface InstructionSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  onContinue: () => void;
}
