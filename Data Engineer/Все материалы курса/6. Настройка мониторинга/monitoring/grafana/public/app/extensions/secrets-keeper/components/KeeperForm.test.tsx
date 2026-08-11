import { render, screen, waitFor, userEvent } from 'test/test-utils';

import { type AwsKeeperFormValues } from '../types';

import { KeeperForm, type KeeperFormProps } from './KeeperForm';

const AWS_DEFAULTS: AwsKeeperFormValues = {
  name: '',
  description: '',
  type: 'aws',
  awsRegion: '',
  awsAssumeRoleArn: '',
  awsKmsKeyId: '',
  isActive: false,
};

const defaultProps: KeeperFormProps = {
  defaultValues: AWS_DEFAULTS,
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  submitText: 'Create',
  canSubmit: false,
  children: <div data-testid="form-children">children</div>,
};

const renderForm = (props: Partial<KeeperFormProps> = {}) => {
  return render(<KeeperForm {...defaultProps} {...props} />);
};

describe('KeeperForm (generic shell)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form element', () => {
    renderForm();
    expect(screen.getByTestId('keeper-form')).toBeInTheDocument();
  });

  it('renders children inside the form', () => {
    renderForm();
    expect(screen.getByTestId('form-children')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('submit button is disabled when canSubmit is false', () => {
    renderForm({ canSubmit: false });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('submit button is enabled when canSubmit is true', () => {
    renderForm({ canSubmit: true });
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('submit button is disabled when isSubmitting even if canSubmit', () => {
    renderForm({ canSubmit: true, isSubmitting: true });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('cancel button is disabled when isSubmitting', () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = jest.fn();
    renderForm({ onCancel });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit with default values when form is submitted', async () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit, canSubmit: true });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'aws', name: '' }));
  });
});
