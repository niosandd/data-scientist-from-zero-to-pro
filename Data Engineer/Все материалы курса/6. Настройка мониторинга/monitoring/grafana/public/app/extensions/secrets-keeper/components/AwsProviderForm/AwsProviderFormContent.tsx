import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

import { type AwsKeeperFormValues } from '../../types';

import { AwsProviderInstructions } from './AwsProviderInstructions';

interface AwsProviderFormContentProps {
  onCanSubmitChange: (canSubmit: boolean) => void;
}

/**
 * AWS-specific form content. Watches required fields and reports readiness
 * to the parent via `onCanSubmitChange`. Renders the 4-section instruction wizard.
 */
export function AwsProviderFormContent({ onCanSubmitChange }: AwsProviderFormContentProps) {
  const { watch } = useFormContext<AwsKeeperFormValues>();

  const [name, description, region, arn] = watch(['name', 'description', 'awsRegion', 'awsAssumeRoleArn']);

  const canSubmit =
    Boolean(name?.trim()) && Boolean(description?.trim()) && Boolean(region?.trim()) && Boolean(arn?.trim());

  useEffect(() => {
    onCanSubmitChange(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

  return <AwsProviderInstructions />;
}
