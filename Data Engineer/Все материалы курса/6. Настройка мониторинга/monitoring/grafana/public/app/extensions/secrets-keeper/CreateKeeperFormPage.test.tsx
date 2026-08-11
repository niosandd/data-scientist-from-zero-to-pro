import { type ReactNode } from 'react';
import { render, screen, waitFor, userEvent } from 'test/test-utils';

import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { CreateAwsKeeperPage } from './CreateKeeperFormPage';
import { type KeeperFormValues } from './types';

const mockCreateKeeper = jest.fn();
const mockUseCreateKeeper = jest.fn().mockReturnValue({
  createKeeper: mockCreateKeeper,
  isLoading: false,
});

jest.mock('./hooks/useCreateKeeper', () => ({
  useCreateKeeper: () => mockUseCreateKeeper(),
}));

const mockLocationPush = jest.fn();

jest.mock('@grafana/runtime', () => {
  const actual = jest.requireActual('@grafana/runtime');
  return {
    ...actual,
    locationService: {
      ...actual.locationService,
      push: (...args: unknown[]) => mockLocationPush(...args),
    },
    getAppEvents: () => ({ publish: jest.fn() }),
  };
});

// Mock KeeperForm as a minimal shell that renders children and exposes submit/cancel
jest.mock('./components/KeeperForm', () => ({
  KeeperForm: ({
    onSubmit,
    onCancel,
    isSubmitting,
    canSubmit,
    children,
  }: {
    defaultValues: KeeperFormValues;
    onSubmit: (values: KeeperFormValues) => void;
    onCancel: () => void;
    submitText: string;
    isSubmitting?: boolean;
    canSubmit: boolean;
    children: ReactNode;
  }) => (
    <div data-testid="keeper-form">
      {children}
      <button
        data-testid="form-submit"
        disabled={isSubmitting || !canSubmit}
        onClick={() =>
          onSubmit({
            name: 'test-keeper',
            description: 'Test',
            type: 'aws',
            awsRegion: 'us-east-1',
            awsAssumeRoleArn: 'arn:aws:iam::123:role/test',
            awsKmsKeyId: '',
            isActive: false,
          })
        }
      >
        Submit
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock AwsProviderFormContent to report canSubmit=true after mount
jest.mock('./components/AwsProviderForm/AwsProviderFormContent', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    AwsProviderFormContent: ({ onCanSubmitChange }: { onCanSubmitChange: (v: boolean) => void }) => {
      useEffect(() => onCanSubmitChange(true), [onCanSubmitChange]);
      return <div data-testid="aws-form-content" />;
    },
  };
});

describe('CreateAwsKeeperPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockUseCreateKeeper.mockReturnValue({
      createKeeper: mockCreateKeeper,
      isLoading: false,
    });
  });

  it('renders the form', () => {
    render(<CreateAwsKeeperPage />);
    expect(screen.getByTestId('keeper-form')).toBeInTheDocument();
  });

  it('renders the AWS provider form content', () => {
    render(<CreateAwsKeeperPage />);
    expect(screen.getByTestId('aws-form-content')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<CreateAwsKeeperPage />);
    expect(screen.getByText(/create keeper with aws provider/i)).toBeInTheDocument();
  });

  it('navigates to list on successful creation', async () => {
    const mockKeeper = { metadata: { name: 'test-keeper' }, spec: {}, status: {} } as Keeper;
    mockCreateKeeper.mockResolvedValue(mockKeeper);

    render(<CreateAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    await waitFor(() => {
      expect(mockLocationPush).toHaveBeenCalledWith('/admin/secrets/keepers');
    });
  });

  it('shows error alert on creation failure', async () => {
    mockCreateKeeper.mockRejectedValue(new Error('Keeper already exists'));

    render(<CreateAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    expect(await screen.findByText('Keeper already exists')).toBeInTheDocument();
    expect(screen.getByText('Failed to create keeper')).toBeInTheDocument();
  });

  it('navigates to chooser on form cancel', async () => {
    render(<CreateAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-cancel'));
    expect(mockLocationPush).toHaveBeenCalledWith('/admin/secrets/keepers/new');
  });

  it('shows stringified error for non-Error rejections', async () => {
    mockCreateKeeper.mockRejectedValue('string error');

    render(<CreateAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    expect(await screen.findByText('string error')).toBeInTheDocument();
  });

  it('disables form submit when loading', () => {
    mockUseCreateKeeper.mockReturnValue({
      createKeeper: mockCreateKeeper,
      isLoading: true,
    });

    render(<CreateAwsKeeperPage />);
    expect(screen.getByTestId('form-submit')).toBeDisabled();
  });
});
