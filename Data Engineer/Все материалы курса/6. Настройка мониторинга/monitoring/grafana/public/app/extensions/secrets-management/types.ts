import { type FieldPath } from 'react-hook-form';

export interface SecretFormValues {
  name: string;
  description: string;
  decrypters?: Array<{ label: string; value: string }>;
  labels?: Array<{ name: string; value: string }>;
  uid?: string;
  keeper?: string;
  value?: string;
}

export type FieldErrorMap = Partial<Record<FieldPath<SecretFormValues>, { message: string }>>;
