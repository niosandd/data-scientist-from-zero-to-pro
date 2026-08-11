import { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, userEvent } from 'test/test-utils';

import { type AwsKeeperFormValues } from '../../types';

import { AwsProviderEditContent } from './AwsProviderEditContent';

const AWS_DEFAULTS: AwsKeeperFormValues = {
  name: 'aws-prod',
  description: 'Production keeper',
  type: 'aws',
  awsRegion: 'us-east-1',
  awsAssumeRoleArn: 'arn:aws:iam::123456789012:role/MyRole',
  awsKmsKeyId: 'key-abc',
  isActive: false,
};

function FormWrapper({ children, defaults }: { children: ReactNode; defaults?: Partial<AwsKeeperFormValues> }) {
  const methods = useForm<AwsKeeperFormValues>({
    mode: 'onChange',
    defaultValues: { ...AWS_DEFAULTS, ...defaults },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

const renderEdit = (defaults?: Partial<AwsKeeperFormValues>) =>
  render(
    <FormWrapper defaults={defaults}>
      <AwsProviderEditContent onCanSubmitChange={jest.fn()} />
    </FormWrapper>
  );

describe('AwsProviderEditContent', () => {
  it('renders Role ARN, Region, KMS Key ID, and Active fields', async () => {
    renderEdit();
    // findBy awaits RHF's initial validity computation (which fires a state update on mount).
    expect(await screen.findByTestId('aws-arn-input')).toBeInTheDocument();
    expect(screen.getByTestId('aws-region-input')).toBeInTheDocument();
    expect(screen.getByTestId('aws-kms-key-id-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-active-switch')).toBeInTheDocument();
  });

  it('renders Role ARN before Region before KMS Key ID', async () => {
    renderEdit();
    const arn = await screen.findByTestId('aws-arn-input');
    const inputs = screen.getAllByRole('textbox');
    const region = screen.getByTestId('aws-region-input');
    const kms = screen.getByTestId('aws-kms-key-id-input');

    expect(inputs.indexOf(arn)).toBeLessThan(inputs.indexOf(region));
    expect(inputs.indexOf(region)).toBeLessThan(inputs.indexOf(kms));
  });

  it('marks KMS Key ID as optional (no aria-required)', async () => {
    renderEdit();
    expect(await screen.findByTestId('aws-kms-key-id-input')).not.toHaveAttribute('aria-required', 'true');
  });

  it('prefills KMS Key ID from defaults', async () => {
    renderEdit();
    expect(await screen.findByTestId('aws-kms-key-id-input')).toHaveValue('key-abc');
  });

  it('allows clearing the KMS Key ID', async () => {
    renderEdit();
    const user = userEvent.setup();
    const kms = await screen.findByTestId('aws-kms-key-id-input');

    await user.clear(kms);
    expect(kms).toHaveValue('');
  });

  it('allows editing the KMS Key ID', async () => {
    renderEdit({ awsKmsKeyId: '' });
    const user = userEvent.setup();
    const kms = await screen.findByTestId('aws-kms-key-id-input');

    await user.type(kms, 'new-key-xyz');
    expect(kms).toHaveValue('new-key-xyz');
  });
});
