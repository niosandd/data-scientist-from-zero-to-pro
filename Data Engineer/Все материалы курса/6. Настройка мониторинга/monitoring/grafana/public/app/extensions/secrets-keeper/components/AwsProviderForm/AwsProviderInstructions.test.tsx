import { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, userEvent } from 'test/test-utils';

import { GRAFANA_ACCOUNT_ID } from '../../constants';
import { type AwsKeeperFormValues } from '../../types';

import { AwsProviderInstructions } from './AwsProviderInstructions';

const AWS_DEFAULTS: AwsKeeperFormValues = {
  name: '',
  description: '',
  type: 'aws',
  awsRegion: '',
  awsAssumeRoleArn: '',
  awsKmsKeyId: '',
  isActive: false,
};

function FormWrapper({ children }: { children: ReactNode }) {
  const methods = useForm<AwsKeeperFormValues>({ mode: 'onChange', defaultValues: AWS_DEFAULTS });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

const renderInstructions = () =>
  render(
    <FormWrapper>
      <AwsProviderInstructions />
    </FormWrapper>
  );

describe('AwsProviderInstructions', () => {
  it('renders all four section headers', () => {
    renderInstructions();
    expect(screen.getByText(/1\. create an iam policy/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. create an iam role/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. verify trust policy/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. configure keeper/i)).toBeInTheDocument();
  });

  it('opens section 1 by default, sections 2-4 are closed', () => {
    renderInstructions();
    expect(screen.getByTestId('section-1-content')).toBeInTheDocument();
    expect(screen.queryByTestId('section-2-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('section-3-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('section-4-content')).not.toBeInTheDocument();
  });

  it('toggles section 2 open when its header is clicked', async () => {
    renderInstructions();
    const user = userEvent.setup();

    await user.click(screen.getByText(/2\. create an iam role/i));
    expect(screen.getByTestId('section-2-content')).toBeInTheDocument();
  });

  describe('section navigation via Continue', () => {
    it('Continue in section 1 closes 1 and opens 2', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByTestId('section-1-continue'));

      expect(screen.queryByTestId('section-1-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('section-2-content')).toBeInTheDocument();
    });

    it('Continue advances from section 1 through section 3', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByTestId('section-1-continue'));
      await user.click(screen.getByTestId('section-2-continue'));

      expect(screen.queryByTestId('section-2-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('section-3-content')).toBeInTheDocument();
    });

    it('Continue advances from section 1 through to section 4 (form)', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByTestId('section-1-continue'));
      await user.click(screen.getByTestId('section-2-continue'));
      await user.click(screen.getByTestId('section-3-continue'));

      expect(screen.queryByTestId('section-3-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('section-4-content')).toBeInTheDocument();
    });
  });

  describe('section 4 form fields', () => {
    it('renders form fields when section 4 is open', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/4\. configure keeper/i));

      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByTestId('aws-arn-input')).toBeInTheDocument();
      expect(screen.getByTestId('aws-region-input')).toBeInTheDocument();
      expect(screen.getByTestId('aws-kms-key-id-input')).toBeInTheDocument();
    });

    it('renders Role ARN before Region before KMS Key ID', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/4\. configure keeper/i));

      const inputs = screen.getAllByRole('textbox');
      const arn = screen.getByTestId('aws-arn-input');
      const region = screen.getByTestId('aws-region-input');
      const kms = screen.getByTestId('aws-kms-key-id-input');

      expect(inputs.indexOf(arn)).toBeLessThan(inputs.indexOf(region));
      expect(inputs.indexOf(region)).toBeLessThan(inputs.indexOf(kms));
    });

    it('marks KMS Key ID as optional (no aria-required)', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/4\. configure keeper/i));

      const kms = screen.getByTestId('aws-kms-key-id-input');
      expect(kms).not.toHaveAttribute('aria-required', 'true');
    });

    it('shows required fields note', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/4\. configure keeper/i));
      expect(screen.getByText(/indicates a required field/i)).toBeInTheDocument();
    });
  });

  describe('policy JSON drawer', () => {
    it('policy JSON is not visible by default', () => {
      renderInstructions();
      expect(screen.queryByText(/GrafanaManagedSecrets/)).not.toBeInTheDocument();
    });

    it('shows policy JSON when "View policy JSON" is clicked', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/view policy json/i));
      expect(screen.getByText(/GrafanaManagedSecrets/)).toBeInTheDocument();
    });

    it('hides policy JSON when toggled closed', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/view policy json/i));
      await user.click(screen.getByText(/view policy json/i));
      expect(screen.queryByText(/GrafanaManagedSecrets/)).not.toBeInTheDocument();
    });
  });

  describe('KMS drawer', () => {
    it('shows KMS content when "Using a custom KMS key?" is clicked', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/using a custom kms key/i));
      expect(screen.getByText(/KMSForSecretsManager/)).toBeInTheDocument();
      expect(screen.getByText(/kms:Decrypt/)).toBeInTheDocument();
    });
  });

  describe('trust policy JSON drawer', () => {
    it('trust policy JSON is not visible by default in section 3', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/3\. verify trust policy/i));
      expect(screen.queryByText(/sts:AssumeRole/)).not.toBeInTheDocument();
    });

    it('shows trust policy JSON when "View trust policy JSON" is clicked', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/3\. verify trust policy/i));
      await user.click(screen.getByText(/view trust policy json/i));
      expect(screen.getByText(/sts:AssumeRole/)).toBeInTheDocument();
    });
  });

  describe('section 2 account details', () => {
    it('shows Grafana account ID inline in section 2 steps', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/2\. create an iam role/i));
      expect(screen.getByText(GRAFANA_ACCOUNT_ID)).toBeInTheDocument();
    });

    it('shows external ID inline in section 2 steps', async () => {
      renderInstructions();
      const user = userEvent.setup();

      await user.click(screen.getByText(/2\. create an iam role/i));
      expect(screen.getByText('grafana-ext-a1b2c3d4e5f6')).toBeInTheDocument();
    });

  });

  describe('Section complete checkboxes', () => {
    it('renders "Section complete" checkboxes in section 1', () => {
      renderInstructions();
      const checkboxes = screen.getAllByTestId('subsection-complete');
      expect(checkboxes).toHaveLength(3);
    });

    it('checkboxes start unchecked', () => {
      renderInstructions();
      const checkboxes = screen.getAllByTestId('subsection-complete');
      checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });

    it('toggles a checkbox when clicked', async () => {
      renderInstructions();
      const user = userEvent.setup();

      const [firstCheckbox] = screen.getAllByTestId('subsection-complete');
      await user.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();

      await user.click(firstCheckbox);
      expect(firstCheckbox).not.toBeChecked();
    });
  });

  describe('section status icons', () => {
    it('shows no check-circle icons when no checkboxes are checked', () => {
      renderInstructions();
      expect(screen.queryByTestId('icon-check-circle')).not.toBeInTheDocument();
    });

    it('shows check-circle icon for section 1 when all subsections are complete', async () => {
      renderInstructions();
      const user = userEvent.setup();

      const checkboxes = screen.getAllByTestId('subsection-complete');
      for (const cb of checkboxes) {
        await user.click(cb);
      }

      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });
  });
});
