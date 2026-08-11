import { of } from 'rxjs';

import { type PluginMeta, PluginSignatureType } from '@grafana/data';
import { type BackendSrvRequest, config, type FetchError, type FetchResponse } from '@grafana/runtime';
import { getPluginSettings } from '@grafana/runtime/unstable';
import { type BackendSrv } from 'app/core/services/backend_srv';
import { contextSrv } from 'app/core/services/context_srv';
import {
  shouldLoadPluginInFrontendSandbox,
  isPluginFrontendSandboxEnabled,
} from 'app/features/plugins/sandbox/sandboxPluginLoaderRegistry';

import { initSandboxPluginLoaderRegistry } from './sandboxLoader';

const request = jest.fn<Promise<FetchResponse | FetchError>, BackendSrvRequest[]>();
const mockContextSrv = jest.mocked(contextSrv);

const backendSrv = {
  fetch: (options: BackendSrvRequest) => {
    return of(request(options));
  },
} as unknown as BackendSrv;

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => backendSrv,
}));

jest.mock('@grafana/runtime/unstable', () => ({
  ...jest.requireActual('@grafana/runtime/unstable'),
  getPluginSettings: jest.fn(),
}));

jest.mock('app/features/plugins/sandbox/sandboxPluginLoaderRegistry', () => ({
  ...jest.requireActual('app/features/plugins/sandbox/sandboxPluginLoaderRegistry'),
  isPluginFrontendSandboxEnabled: jest.fn(),
}));

const getPluginSettingsMock = getPluginSettings as jest.MockedFunction<typeof getPluginSettings>;
const fakePlugin: PluginMeta = {
  id: 'test-plugin',
  name: 'Test Plugin',
} as PluginMeta;

const isPluginFrontendSandboxEnabledInOssMock = isPluginFrontendSandboxEnabled as jest.MockedFunction<
  typeof isPluginFrontendSandboxEnabled
>;

describe('shouldLoadPluginInFrontendSandbox', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const plugin = 'test-plugin';

  beforeEach(() => {
    config.bootData.user.isSignedIn = true;
    process.env.NODE_ENV = 'development';
    getPluginSettingsMock.mockResolvedValue({ ...fakePlugin, signatureType: PluginSignatureType.community });
    initSandboxPluginLoaderRegistry();
    request.mockReset();
    isPluginFrontendSandboxEnabledInOssMock.mockClear();
    mockContextSrv.isSignedIn = true;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should be enabled for a configured plugin', async () => {
    request.mockReturnValue(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin } }] } } as FetchResponse)
    );
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
  });

  it('should use the cache for further requests', async () => {
    request.mockReturnValueOnce(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin } }] } } as FetchResponse)
    );
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
    const resBis = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(resBis).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should be disabled if the request returns a 404 (OSS fallback false)', async () => {
    request.mockReturnValue(Promise.reject({ status: 404 } as FetchError));
    // OSS fallback method returns false
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(false);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
  });

  it('should be disabled if the request returns a 404 (OSS fallback true)', async () => {
    request.mockReturnValue(Promise.reject({ status: 404 } as FetchError));
    // OSS fallback method returns true
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(true);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
  });

  it('should be disabled if the request returns a 403 (OSS fallback false)', async () => {
    request.mockReturnValue(Promise.reject({ status: 403 } as FetchError));
    // OSS fallback method returns false
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(false);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
  });

  it('should fallback to OSS if the request returns an empty list', async () => {
    request.mockReturnValue(Promise.resolve({ data: {} } as FetchResponse));
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(false);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
    expect(isPluginFrontendSandboxEnabledInOssMock).toHaveBeenCalledWith({ pluginId: plugin });
  });

  it('should fallback to the OSS check if the user is not logged in', async () => {
    config.bootData.user.isSignedIn = false;
    // OSS fallback method returns true
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(true);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
  });

  it('should fallback to OSS when cache exists but plugin not in cache (OSS returns true)', async () => {
    // First request populates cache with a different plugin
    request.mockReturnValueOnce(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin: 'other-plugin' } }] } } as FetchResponse)
    );
    await shouldLoadPluginInFrontendSandbox({ pluginId: 'other-plugin' });

    // Second request for different plugin should use cache but fall back to OSS
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(true);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
    expect(isPluginFrontendSandboxEnabledInOssMock).toHaveBeenCalledWith({ pluginId: plugin });
  });

  it('should fallback to OSS when cache exists but plugin not in cache (OSS returns false)', async () => {
    // First request populates cache with a different plugin
    request.mockReturnValueOnce(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin: 'other-plugin' } }] } } as FetchResponse)
    );
    await shouldLoadPluginInFrontendSandbox({ pluginId: 'other-plugin' });

    // Second request for different plugin should use cache but fall back to OSS
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(false);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
    expect(isPluginFrontendSandboxEnabledInOssMock).toHaveBeenCalledWith({ pluginId: plugin });
  });

  it('should return false when plugin explicitly disabled in cache (no OSS fallback)', async () => {
    // First request populates cache with plugin explicitly disabled
    request.mockReturnValueOnce(
      Promise.resolve({ data: { items: [{ spec: { enabled: false, plugin } }] } } as FetchResponse)
    );
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(true);
    await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });

    // Explicitly disabled plugin should stay disabled without calling OSS fallback
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
    expect(isPluginFrontendSandboxEnabledInOssMock).not.toHaveBeenCalled();
  });

  it('should fallback to OSS when plugin not in fetched settings list (OSS returns true)', async () => {
    // API returns settings for other plugins but not our test plugin
    request.mockReturnValue(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin: 'other-plugin' } }] } } as FetchResponse)
    );
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(true);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(true);
    expect(isPluginFrontendSandboxEnabledInOssMock).toHaveBeenCalledWith({ pluginId: plugin });
  });

  it('should fallback to OSS when plugin not in fetched settings list (OSS returns false)', async () => {
    // API returns settings for other plugins but not our test plugin
    request.mockReturnValue(
      Promise.resolve({ data: { items: [{ spec: { enabled: true, plugin: 'other-plugin' } }] } } as FetchResponse)
    );
    isPluginFrontendSandboxEnabledInOssMock.mockResolvedValue(false);
    const res = await shouldLoadPluginInFrontendSandbox({ pluginId: plugin });
    expect(res).toBe(false);
    expect(isPluginFrontendSandboxEnabledInOssMock).toHaveBeenCalledWith({ pluginId: plugin });
  });
});
