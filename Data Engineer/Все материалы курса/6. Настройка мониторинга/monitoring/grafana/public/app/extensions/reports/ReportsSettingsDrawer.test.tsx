import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from 'test/test-utils';

import { config } from '@grafana/runtime';
import { backendSrv } from 'app/core/services/backend_srv';
import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { reportingAPI } from '../api/clients/reporting';

import { ReportsSettingsDrawer } from './ReportsSettingsDrawer';

const server = setupServer();
const hasPermission = jest.fn<boolean, [string]>(() => true);

const mockSettingsData = {
  branding: {
    emailFooterLink: 'https://footer-link.com',
    emailFooterMode: 'sent-by',
    emailFooterText: 'Test',
    emailLogoUrl: 'https://email-logo.jpg',
    reportLogoUrl: 'https://report-logo.jpg',
  },
  id: 0,
  orgId: 1,
  userId: 1,
  pdfTheme: 'light',
  embeddedImageTheme: 'dark',
  pdfHeaderEnabled: true,
  pdfTimeRangeEnabled: true,
  pdfDashboardTitleEnabled: true,
  footerItems: [{ type: 'pageNumber' }, { type: 'flexSpacer' }, { type: 'logo' }],
  footerFontFamily: '',
};

beforeAll(() => {
  addRootReducer({
    [reportingAPI.reducerPath]: reportingAPI.reducer,
  });
  addExtraMiddleware(reportingAPI.middleware);
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  window.URL.createObjectURL = jest.fn(() => 'blob:https://');
  config.rendererAvailable = true;
  config.featureToggles.reportingHeaderSettings = true;
  config.featureToggles.reportingFooterSettings = true;
  hasPermission.mockReturnValue(true);

  server.use(
    http.get('/api/reports/settings', () => HttpResponse.json(mockSettingsData)),
    http.post('/api/reports/settings', () => HttpResponse.json({}))
  );
});

afterEach(() => {
  (window.URL.createObjectURL as jest.Mock).mockReset();
  jest.clearAllMocks();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => backendSrv,
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    rendererAvailable: true,
  },
}));

jest.mock('app/core/services/context_srv', () => {
  return {
    contextSrv: {
      ...jest.requireActual('app/core/services/context_srv').contextSrv,
      hasPermission: (action: string) => hasPermission(action),
    },
  };
});

const setup = async () => {
  const onClose = jest.fn();
  const result = render(<ReportsSettingsDrawer onClose={onClose} />);

  await waitForElementToBeRemoved(() => screen.queryByText('Loading settings...'));

  return { ...result, onClose };
};

describe('ReportsSettingsDrawer', () => {
  it('renders with default toggle values when settings endpoint returns an empty object', async () => {
    server.use(http.get('/api/reports/settings', () => HttpResponse.json({})));

    await setup();

    expect(screen.getByRole('switch', { name: /show header/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /show dashboard title/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /show data time range/i })).toBeChecked();
    expect(screen.getByText(/configure the items displayed in the PDF footer/i)).toBeInTheDocument();
  });

  it('populates toggles from existing settings', async () => {
    server.use(
      http.get('/api/reports/settings', () =>
        HttpResponse.json({
          ...mockSettingsData,
          pdfHeaderEnabled: false,
          pdfTimeRangeEnabled: true,
          pdfDashboardTitleEnabled: false,
        })
      )
    );

    await setup();

    expect(screen.getByRole('switch', { name: /show header/i })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /show dashboard title/i })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /show data time range/i })).toBeChecked();
  });

  it('reorders footer items with move controls before saving', async () => {
    const { user } = await setup();
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await user.click(screen.getAllByRole('button', { name: /move .+ down/i })[0]);
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const postCall = fetchSpy.mock.calls.find(([, requestInit]) => requestInit?.method === 'POST');
    expect(postCall).toBeDefined();

    const [, requestInit] = postCall ?? [];
    const formData = requestInit?.body as FormData;
    const configPayload = formData.get('config');
    expect(typeof configPayload).toBe('string');

    expect(JSON.parse(configPayload as string)).toMatchObject({
      footerItems: [{ type: 'flexSpacer' }, { type: 'pageNumber' }, { type: 'logo' }],
    });

    fetchSpy.mockRestore();
  });

  it('normalizes loaded rgb footer colors to hex before saving', async () => {
    server.use(
      http.get('/api/reports/settings', () =>
        HttpResponse.json({
          ...mockSettingsData,
          footerItems: [{ type: 'fixedText', value: 'Confidential', color: 'rgb(255, 0, 0)' }],
        })
      )
    );

    const { user } = await setup();
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const postCall = fetchSpy.mock.calls.find(([, requestInit]) => requestInit?.method === 'POST');
    expect(postCall).toBeDefined();

    const [, requestInit] = postCall ?? [];
    const formData = requestInit?.body as FormData;
    const configPayload = formData.get('config');
    expect(typeof configPayload).toBe('string');

    expect(JSON.parse(configPayload as string)).toMatchObject({
      footerItems: [{ type: 'fixedText', value: 'Confidential', color: '#ff0000' }],
    });

    fetchSpy.mockRestore();
  });

  it('submits the settings payload through saveSettings', async () => {
    const { user, onClose } = await setup();
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await user.click(screen.getByRole('switch', { name: /show header/i }));
    await user.click(screen.getByRole('switch', { name: /show dashboard title/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const postCall = fetchSpy.mock.calls.find(([, requestInit]) => requestInit?.method === 'POST');
    expect(postCall).toBeDefined();

    const [, requestInit] = postCall ?? [];
    const formData = requestInit?.body as FormData;
    const configPayload = formData.get('config');
    expect(typeof configPayload).toBe('string');

    expect(JSON.parse(configPayload as string)).toMatchObject({
      pdfHeaderEnabled: false,
      pdfTimeRangeEnabled: true,
      pdfDashboardTitleEnabled: false,
      pdfTheme: 'light',
      embeddedImageTheme: 'dark',
      footerItems: [{ type: 'pageNumber' }, { type: 'flexSpacer' }, { type: 'logo' }],
      footerFontFamily: '',
    });

    fetchSpy.mockRestore();
  });

  it('disables the form when the user lacks write permission', async () => {
    hasPermission.mockReturnValue(false);

    await setup();

    expect(screen.getByRole('switch', { name: /show header/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /show dashboard title/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /show data time range/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('renders an error state when loading settings fails', async () => {
    server.use(http.get('/api/reports/settings', () => HttpResponse.text('boom', { status: 500 })));

    render(<ReportsSettingsDrawer onClose={jest.fn()} />);

    expect(await screen.findByText(/failed to load settings/i)).toBeInTheDocument();
  });

  it('renders NoRendererInfoBox when renderer is not available', async () => {
    config.rendererAvailable = false;
    await setup();
    expect(await screen.findByText(/Grafana Image renderer/i)).toBeInTheDocument();
  });

  it('hides the footer editor when the footer toggle is disabled', async () => {
    config.featureToggles.reportingFooterSettings = false;

    await setup();

    expect(screen.queryByText(/configure the items displayed in the PDF footer/i)).not.toBeInTheDocument();
  });

  it('adds a new footer item via the dropdown and includes it in the save payload', async () => {
    const { user } = await setup();
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await user.click(screen.getByRole('combobox', { name: /add footer item/i }));
    await user.click(await screen.findByRole('option', { name: /fixed text/i }));

    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const postCall = fetchSpy.mock.calls.find(([, requestInit]) => requestInit?.method === 'POST');
    expect(postCall).toBeDefined();

    const [, requestInit] = postCall ?? [];
    const formData = requestInit?.body as FormData;
    const configPayload = formData.get('config');
    expect(typeof configPayload).toBe('string');

    expect(JSON.parse(configPayload as string)).toMatchObject({
      footerItems: [{ type: 'pageNumber' }, { type: 'flexSpacer' }, { type: 'logo' }, { type: 'fixedText' }],
    });

    fetchSpy.mockRestore();
  });

  it('adjusts expanded style panel when removing an item above it', async () => {
    server.use(
      http.get('/api/reports/settings', () =>
        HttpResponse.json({
          ...mockSettingsData,
          footerItems: [{ type: 'pageNumber' }, { type: 'fixedText', value: 'Confidential' }, { type: 'logo' }],
        })
      )
    );

    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: /toggle fixed text style options/i }));
    expect(screen.getByText('Weight')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove page number/i }));

    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle fixed text style options/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
