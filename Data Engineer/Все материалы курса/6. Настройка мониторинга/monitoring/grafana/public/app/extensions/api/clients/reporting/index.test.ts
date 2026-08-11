import { configureStore } from '@reduxjs/toolkit';

import { config } from '@grafana/runtime';
import { appNotificationsReducer } from 'app/core/reducers/appNotification';
import { FooterMode, type ReportsSettings } from 'app/extensions/types/reports';
import { AppNotificationSeverity } from 'app/types/appNotifications';

import { reportingAPI } from './index';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    appSubUrl: '',
  },
}));

const fetchMock = jest.fn();

// RTK Query may expose mutation failures as a string or a SerializedError-shaped object.
function mutationErrorText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

function minimalReportsSettings(): ReportsSettings {
  return {
    pdfTheme: 'light',
    embeddedImageTheme: 'light',
    branding: {
      reportLogoUrl: '',
      emailLogoUrl: '',
      emailFooterMode: FooterMode.None,
      emailFooterText: '',
      emailFooterLink: '',
    },
    pdfDashboardTitleEnabled: false,
    pdfHeaderEnabled: false,
    pdfTimeRangeEnabled: false,
    footerItems: [{ type: 'pageNumber' }, { type: 'flexSpacer' }, { type: 'logo' }],
    footerFontFamily: '',
  };
}

describe('reportingAPI saveSettings', () => {
  const createTestStore = () =>
    configureStore({
      reducer: {
        [reportingAPI.reducerPath]: reportingAPI.reducer,
        appNotifications: appNotificationsReducer,
      },
      preloadedState: {
        appNotifications: { byId: {}, lastRead: 0 },
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(reportingAPI.middleware),
    });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });

  afterEach(() => {
    config.appSubUrl = '';
  });

  it('POSTs to /api/reports/settings when appSubUrl is empty', async () => {
    config.appSubUrl = '';

    const store = createTestStore();
    await store.dispatch(reportingAPI.endpoints.saveSettings.initiate(minimalReportsSettings()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports/settings',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('prefixes appSubUrl for POST /api/reports/settings when served from a subpath', async () => {
    config.appSubUrl = '/meme-test/grafana';

    const store = createTestStore();
    await store.dispatch(reportingAPI.endpoints.saveSettings.initiate(minimalReportsSettings()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/meme-test/grafana/api/reports/settings',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('dispatches an error notification and returns error when response is not ok', async () => {
    config.appSubUrl = '';
    fetchMock.mockResolvedValue({
      ok: false,
      status: 418,
      text: () => Promise.resolve('teapot'),
    } as Response);

    const store = createTestStore();
    const result = await store.dispatch(reportingAPI.endpoints.saveSettings.initiate(minimalReportsSettings()));

    expect(result.error).toBeDefined();
    expect(mutationErrorText(result.error)).toContain('HTTP 418');

    const notifications = Object.values(store.getState().appNotifications.byId);
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Error saving configuration',
          severity: AppNotificationSeverity.Error,
          text: 'HTTP 418: teapot',
        }),
      ])
    );
    expect(
      notifications.some(
        (n) => n.severity === AppNotificationSeverity.Success && n.title === 'Successfully saved configuration'
      )
    ).toBe(false);
  });

  it('dispatches an error notification and returns error when fetch rejects', async () => {
    config.appSubUrl = '';
    fetchMock.mockRejectedValue(new Error('network failed'));

    const store = createTestStore();
    const result = await store.dispatch(reportingAPI.endpoints.saveSettings.initiate(minimalReportsSettings()));

    expect(result.error).toBeDefined();
    expect(mutationErrorText(result.error)).toContain('network failed');

    expect(Object.values(store.getState().appNotifications.byId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Error saving configuration',
          severity: AppNotificationSeverity.Error,
          text: 'network failed',
        }),
      ])
    );
  });
});
