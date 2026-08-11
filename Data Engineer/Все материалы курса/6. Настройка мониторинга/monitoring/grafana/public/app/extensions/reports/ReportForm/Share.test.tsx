import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { GrafanaEdition } from '@grafana/data/internal';
import { config } from '@grafana/runtime';
import { getRouteComponentProps } from 'app/core/navigation/mocks/routeProps';
import { addRootReducer } from 'app/store/configureStore';

import { mockToolkitActionCreator } from '../../../../test/core/redux/mocks';
import reportsReducers, { defaultTimeRange, initialState, updateReportProp } from '../state/reducers';

import { Share, type Props } from './Share';

config.licenseInfo = {
  enabledFeatures: { 'reports.email': true },
  expiry: 0,
  licenseUrl: '',
  stateInfo: '',
  edition: GrafanaEdition.Enterprise,
};

jest.mock('app/core/services/context_srv', () => {
  return {
    contextSrv: {
      ...jest.requireActual('app/core/services/context_srv').contextSrv,
      hasPermission: () => true,
    },
  };
});

const blankReport = initialState.report;
const mockUpdate = jest.fn() as any;

const setup = (propOverrides?: Partial<Props>) => {
  addRootReducer(reportsReducers);
  const props: Props = {
    ...getRouteComponentProps(),
    report: blankReport,
    testEmailIsSending: false,
    updateReportProp: mockToolkitActionCreator(updateReportProp),
    sendTestEmail: jest.fn(),
    ...propOverrides,
  };

  return {
    user: userEvent.setup(),
    component: render(
      <TestProvider>
        <Share {...props} />
      </TestProvider>
    ),
  };
};

describe('Share report', () => {
  it('should render', () => {
    setup();
    expect(screen.getByText(/4. Share/i)).toBeInTheDocument();
  });

  it('should save form values', async () => {
    const { user } = setup({ updateReportProp: mockUpdate });
    await user.type(screen.getByRole('textbox', { name: /report name/i }), 'Test report');
    await user.type(screen.getByPlaceholderText(/email subject/i), 'Test subject report');
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), 'text@me.com');
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), '{enter}');
    await user.type(screen.getByRole('textbox', { name: /reply-to email/i }), 'reply@test.com');
    await user.click(screen.getByRole('checkbox', { name: /include a dashboard link/i }));
    fireEvent.submit(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        ...blankReport,
        name: 'Test report',
        subject: 'Test subject report',
        recipients: 'text@me.com',
        replyTo: 'reply@test.com',
        enableDashboardUrl: false,
      })
    );
  });

  it('should validate recipients', async () => {
    const { user } = setup({ updateReportProp: mockUpdate });
    fireEvent.input(await screen.findByRole('textbox', { name: /report name/i }), { target: { value: 'Test report' } });
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), 'textme.com');
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), '{enter}');

    fireEvent.submit(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
    expect((screen.getByRole('textbox', { name: /report name/i }) as HTMLInputElement).value).toBe('Test report');
  });

  it('should have "Send Test Email" button disabled until the required fields are provided', async () => {
    const { user } = setup({
      report: {
        ...blankReport,
        dashboards: [{ dashboard: { name: 'Test dashboard', uid: '1' }, timeRange: defaultTimeRange.raw }],
      },
    });
    expect(screen.getByRole('button', { name: /send test email/i })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /report name/i }), 'Test report');
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/Type in the recipients/), '{enter}');

    expect(await screen.findByRole('button', { name: /send test email/i })).not.toBeDisabled();
  });

  // Regression test due to prior usage of the TagsInput component: ensure very long email addresses can be entered
  it('should allow entering very long email addresses', async () => {
    const { user } = setup({ updateReportProp: mockUpdate });

    // Create a very long email address
    const longLocalPart = 'a'.repeat(200);
    const longEmail = `${longLocalPart}@verylongdomainname.example.com`;
    expect(longEmail.length).toBeGreaterThanOrEqual(200);

    await user.type(screen.getByRole('textbox', { name: /report name/i }), 'Test report');

    const input = screen.getByPlaceholderText(/Type in the recipients/);
    await user.type(input, longEmail);

    // Verify the Add button is enabled (not disabled due to length)
    const addButton = screen.getByRole('button', { name: /Add/i });
    expect(addButton).not.toBeDisabled();

    await user.click(addButton);

    // Verify the email was added as a recipient
    await waitFor(() => {
      expect(screen.getByText(longEmail)).toBeInTheDocument();
    });
  });
});
