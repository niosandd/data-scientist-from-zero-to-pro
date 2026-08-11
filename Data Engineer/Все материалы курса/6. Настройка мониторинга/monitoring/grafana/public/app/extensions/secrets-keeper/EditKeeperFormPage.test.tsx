import { type ReactNode } from 'react';
import { render, screen, waitFor, userEvent } from 'test/test-utils';

import { type Keeper } from 'app/extensions/api/clients/secret/v1beta1/endpoints.gen';

import { EditAwsKeeperPage } from './EditKeeperFormPage';
import { type KeeperFormValues } from './types';

const mockKeeper: Keeper = {
  metadata: { name: 'aws-prod', resourceVersion: 'rv-42' },
  spec: {
    description: 'Production keeper',
    aws: {
      region: 'us-east-1',
      assumeRole: { assumeRoleArn: 'arn:aws:iam::123456789012:role/MyRole', externalID: 'ext-id' },
      kmsKeyId: 'key-abc',
    },
  },
  status: { active: false },
};

const mockReplaceKeeper = jest.fn();
const mockUseReplaceKeeper = jest.fn().mockReturnValue({
  replaceKeeper: mockReplaceKeeper,
  isLoading: false,
});

jest.mock('./hooks/useReplaceKeeper', () => ({
  useReplaceKeeper: () => mockUseReplaceKeeper(),
}));

const mockUseKeeper = jest.fn().mockReturnValue({
  keeper: mockKeeper,
  isLoading: false,
  error: undefined,
});

jest.mock('./hooks/useKeeper', () => ({
  useKeeper: (...args: unknown[]) => mockUseKeeper(...args),
}));

const mockActivateKeeper = jest.fn();
const mockUseActivateKeeper = jest.fn().mockReturnValue({
  activateKeeper: mockActivateKeeper,
  isLoading: false,
});

jest.mock('./hooks/useActivateKeeper', () => ({
  useActivateKeeper: () => mockUseActivateKeeper(),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useParams: () => ({ name: 'aws-prod' }),
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

// Tests override this to control the isActive value the mock submits.
let submitIsActive = false;

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
            name: 'aws-prod',
            description: 'Updated desc',
            type: 'aws',
            awsRegion: 'eu-west-1',
            awsAssumeRoleArn: 'arn:aws:iam::123456789012:role/MyRole',
            awsKmsKeyId: '',
            isActive: submitIsActive,
          })
        }
      >
        Save
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

jest.mock('./components/AwsProviderForm/AwsProviderEditContent', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    AwsProviderEditContent: ({ onCanSubmitChange }: { onCanSubmitChange: (v: boolean) => void }) => {
      useEffect(() => onCanSubmitChange(true), [onCanSubmitChange]);
      return <div data-testid="aws-edit-content" />;
    },
  };
});

jest.mock('./components/AwsProviderForm/AwsProviderSection1', () => ({
  AwsProviderSection1: () => <div data-testid="section-1" />,
}));
jest.mock('./components/AwsProviderForm/AwsProviderSection2', () => ({
  AwsProviderSection2: () => <div data-testid="section-2" />,
}));
jest.mock('./components/AwsProviderForm/AwsProviderSection3', () => ({
  AwsProviderSection3: () => <div data-testid="section-3" />,
}));
jest.mock('./components/AwsProviderForm/awsProviderInstructionStyles', () => ({
  getInstructionStyles: () => ({ drawerBox: '' }),
}));

describe('EditAwsKeeperPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockUseKeeper.mockReturnValue({ keeper: mockKeeper, isLoading: false, error: undefined });
    mockUseReplaceKeeper.mockReturnValue({ replaceKeeper: mockReplaceKeeper, isLoading: false });
    mockUseActivateKeeper.mockReturnValue({
      activateKeeper: mockActivateKeeper,
      isLoading: false,
    });
    mockActivateKeeper.mockResolvedValue(undefined);
  });

  it('renders the form with edit content', () => {
    render(<EditAwsKeeperPage />);
    expect(screen.getByTestId('keeper-form')).toBeInTheDocument();
    expect(screen.getByTestId('aws-edit-content')).toBeInTheDocument();
  });

  it('fetches keeper by name from URL params', () => {
    render(<EditAwsKeeperPage />);
    expect(mockUseKeeper).toHaveBeenCalledWith('aws-prod');
  });

  it('navigates to list on successful save', async () => {
    const updatedKeeper = { ...mockKeeper, metadata: { ...mockKeeper.metadata, resourceVersion: 'rv-43' } };
    mockReplaceKeeper.mockResolvedValue(updatedKeeper);

    render(<EditAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    await waitFor(() => {
      expect(mockLocationPush).toHaveBeenCalledWith('/admin/secrets/keepers');
    });
  });

  it('passes name and resourceVersion to replaceKeeper', async () => {
    mockReplaceKeeper.mockResolvedValue(mockKeeper);

    render(<EditAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    await waitFor(() => {
      expect(mockReplaceKeeper).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'aws-prod', type: 'aws' }),
        'aws-prod',
        'rv-42'
      );
    });
  });

  it('shows error alert on save failure', async () => {
    mockReplaceKeeper.mockRejectedValue(new Error('Conflict: resource version mismatch'));

    render(<EditAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('edit-submit-error')).toBeInTheDocument();
  });

  it('shows fetch error with back link when keeper not found', () => {
    mockUseKeeper.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 404, data: { message: 'Not found' } },
    });

    render(<EditAwsKeeperPage />);

    expect(screen.getByTestId('edit-fetch-error')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-keepers')).toBeInTheDocument();
    expect(screen.queryByTestId('keeper-form')).not.toBeInTheDocument();
  });

  it('navigates to list on cancel', async () => {
    render(<EditAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('form-cancel'));
    expect(mockLocationPush).toHaveBeenCalledWith('/admin/secrets/keepers');
  });

  it('does not render form while loading', () => {
    mockUseKeeper.mockReturnValue({ keeper: undefined, isLoading: true, error: undefined });

    render(<EditAwsKeeperPage />);
    expect(screen.queryByTestId('keeper-form')).not.toBeInTheDocument();
  });

  it('disables submit when saving', () => {
    mockUseReplaceKeeper.mockReturnValue({ replaceKeeper: mockReplaceKeeper, isLoading: true });

    render(<EditAwsKeeperPage />);
    expect(screen.getByTestId('form-submit')).toBeDisabled();
  });

  it('shows instructions toggle after form', () => {
    render(<EditAwsKeeperPage />);
    expect(screen.getByTestId('toggle-instructions')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-keeper-instructions')).not.toBeInTheDocument();
  });

  it('reveals instruction sections when toggle is clicked and hides on second click', async () => {
    render(<EditAwsKeeperPage />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('toggle-instructions'));

    expect(screen.getByTestId('edit-keeper-instructions')).toBeInTheDocument();
    expect(screen.getByTestId('section-1')).toBeInTheDocument();
    expect(screen.getByTestId('section-2')).toBeInTheDocument();
    expect(screen.getByTestId('section-3')).toBeInTheDocument();

    await user.click(screen.getByTestId('toggle-instructions'));

    expect(screen.queryByTestId('edit-keeper-instructions')).not.toBeInTheDocument();
  });

  it('shows unsupported type alert for non-AWS keepers', () => {
    const systemKeeper: Keeper = {
      metadata: { name: 'system-keeper', resourceVersion: 'rv-1' },
      spec: { description: 'System keeper' },
      status: { active: false },
    };
    mockUseKeeper.mockReturnValue({ keeper: systemKeeper, isLoading: false, error: undefined });

    render(<EditAwsKeeperPage />);

    expect(screen.getByTestId('edit-unsupported-type')).toBeInTheDocument();
    expect(screen.queryByTestId('keeper-form')).not.toBeInTheDocument();
  });

  describe('activation status', () => {
    it('renders Active badge when keeper.status.active is true', () => {
      const activeKeeper: Keeper = { ...mockKeeper, status: { active: true } };
      mockUseKeeper.mockReturnValue({ keeper: activeKeeper, isLoading: false, error: undefined });
      render(<EditAwsKeeperPage />);
      expect(screen.getByTestId('edit-active-badge')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-inactive-badge')).not.toBeInTheDocument();
    });

    it('renders Inactive badge when keeper.status.active is false', () => {
      const inactiveKeeper: Keeper = { ...mockKeeper, status: { active: false } };
      mockUseKeeper.mockReturnValue({ keeper: inactiveKeeper, isLoading: false, error: undefined });
      render(<EditAwsKeeperPage />);
      expect(screen.queryByTestId('edit-active-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('edit-inactive-badge')).toBeInTheDocument();
    });

    it('hides the status row entirely while the keeper is still loading', () => {
      mockUseKeeper.mockReturnValue({ keeper: undefined, isLoading: true, error: undefined });
      render(<EditAwsKeeperPage />);
      expect(screen.queryByTestId('edit-active-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-inactive-badge')).not.toBeInTheDocument();
    });
  });

  describe('activate-on-save', () => {
    afterEach(() => {
      submitIsActive = false;
    });

    it('activates this keeper after save when the toggle changed from inactive to active', async () => {
      mockReplaceKeeper.mockResolvedValue(mockKeeper);
      // mockKeeper default has status.active === false, so toggling on is a transition.
      submitIsActive = true;

      render(<EditAwsKeeperPage />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockReplaceKeeper).toHaveBeenCalled();
      });
      expect(mockActivateKeeper).toHaveBeenCalledWith('aws-prod');
    });

    it('reverts to system keeper after save when the toggle changed from active to inactive', async () => {
      const activeKeeper = { ...mockKeeper, status: { active: true } } as Keeper;
      mockUseKeeper.mockReturnValue({ keeper: activeKeeper, isLoading: false, error: undefined });
      mockReplaceKeeper.mockResolvedValue(activeKeeper);
      submitIsActive = false;

      render(<EditAwsKeeperPage />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockReplaceKeeper).toHaveBeenCalled();
      });
      expect(mockActivateKeeper).toHaveBeenCalledWith('system');
    });

    it('does not call activateKeeper when the toggle state matches current state', async () => {
      mockReplaceKeeper.mockResolvedValue(mockKeeper);
      // mockKeeper default has status.active === false; submit also false → no transition.
      submitIsActive = false;

      render(<EditAwsKeeperPage />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockReplaceKeeper).toHaveBeenCalled();
      });
      expect(mockActivateKeeper).not.toHaveBeenCalled();
    });
  });
});
