import { type Props } from 'react-virtualized-auto-sizer';

import { EventBusSrv } from '@grafana/data';
import { config } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { Drawer } from '@grafana/ui';
import { generatedAPI } from 'app/extensions/api/clients/queries/v1beta1/endpoints.gen';
import { useQueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { assertAddToQueryLibraryButtonExists, assertQueryHistory } from 'app/features/explore/spec/helper/assert';
import {
  addQueryHistoryToQueryLibrary,
  openQueryHistory,
  openQueryLibrary,
  submitAddToQueryLibrary,
} from 'app/features/explore/spec/helper/interactions';
import { setupExplore, waitForExplore } from 'app/features/explore/spec/helper/setup';

import { silenceConsoleOutput } from '../../../test/core/utils/silenceConsoleOutput';
import { contextSrv } from '../../core/services/context_srv';
import { addExtraMiddleware, addRootReducer } from '../../store/configureStore';

import { QueryLibraryContextProvider } from './QueryLibraryContextProvider';

jest.mock('@openfeature/react-sdk', () => ({
  ...jest.requireActual('@openfeature/react-sdk'),
  useBooleanFlagValue: () => false,
}));

const reportInteractionMock = jest.fn();
const testEventBus = new EventBusSrv();
testEventBus.publish = jest.fn();

interface MockQuery extends DataQuery {
  expr: string;
}

jest.mock('./utils/dataFetching', () => {
  return {
    __esModule: true,
    ...jest.requireActual('./utils/dataFetching'),
    useLoadUsers: () => {
      return {
        data: {
          display: [
            {
              avatarUrl: '',
              displayName: 'john doe',
              identity: {
                name: 'JohnDoe',
                type: 'viewer',
              },
            },
          ],
        },
        isLoading: false,
        error: null,
      };
    },
  };
});

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  reportInteraction: (...args: object[]) => {
    reportInteractionMock(...args);
  },
  getAppEvents: () => testEventBus,
  usePluginLinks: jest.fn().mockReturnValue({ links: [] }),
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    hasPermission: () => true,
    hasRole: (role: string) => true,
    isSignedIn: true,
    getValidIntervals: (defaultIntervals: string[]) => defaultIntervals,
    user: {
      isSignedIn: true,
      uid: 'u000000001',
    },
    isEditor: true,
  },
}));

const mockContextSrv = jest.mocked(contextSrv);

beforeEach(() => {
  mockContextSrv.isEditor = true;
});

jest.mock('app/core/services/PreferencesService', () => ({
  PreferencesService: function () {
    return {
      patch: jest.fn(),
      load: jest.fn().mockResolvedValue({
        queryHistory: {
          homeTab: 'query',
        },
      }),
    };
  },
}));

jest.mock('../../features/explore/hooks/useExplorePageTitle', () => ({
  useExplorePageTitle: jest.fn(),
}));

jest.mock('react-virtualized-auto-sizer', () => {
  return {
    __esModule: true,
    default(props: Props) {
      return <div>{props.children({ height: 1, scaledHeight: 1, scaledWidth: 1000, width: 1000 })}</div>;
    },
  };
});

jest.mock('./utils/useDatasource', () => ({
  useDatasource: jest.fn().mockReturnValue({
    value: {
      name: 'Loki',
      getQueryDisplayText: jest.fn().mockResolvedValue('TEST'),
      type: 'loki',
      meta: {
        info: {
          name: 'Loki',
          logos: {
            small: 'foo/icn-loki.svg',
          },
        },
      },
    },
    loading: false,
  }),
}));

jest.mock('./QueryLibraryDrawer', () => ({
  ...jest.requireActual('./QueryLibraryDrawer'),
  QueryLibraryDrawer: ({ close }: any) => {
    const { onSave, isDrawerOpen, closeDrawer } = useQueryLibraryContext();

    if (!isDrawerOpen) {
      return null;
    }
    return (
      <Drawer onClose={close} title="Saved queries">
        <input id="title" aria-label="title" />
        <button
          onClick={() => {
            onSave?.();
            closeDrawer();
          }}
        >
          Save
        </button>
        <button onClick={() => closeDrawer()}>Close</button>
      </Drawer>
    );
  },
}));

addRootReducer({
  [generatedAPI.reducerPath]: generatedAPI.reducer,
});
addExtraMiddleware(generatedAPI.middleware);

function setupQueryLibrary() {
  const mockQuery: MockQuery = { refId: 'TEST', expr: 'TEST' };

  setupExplore({
    queryHistory: {
      queryHistory: [{ datasourceUid: 'loki', queries: [mockQuery] }],
      totalCount: 1,
    },
    withAppChrome: true,
    provider: QueryLibraryContextProvider,
  });
}
let previousQueryLibraryEnabled: boolean | undefined;
let previousQueryHistoryEnabled: boolean;

describe('QueryLibrary', () => {
  silenceConsoleOutput();

  beforeAll(() => {
    previousQueryLibraryEnabled = config.featureToggles.queryLibrary;
    previousQueryHistoryEnabled = config.queryHistoryEnabled;

    config.featureToggles.queryLibrary = true;
    config.queryHistoryEnabled = true;
  });

  afterAll(() => {
    config.featureToggles.queryLibrary = previousQueryLibraryEnabled;
    config.queryHistoryEnabled = previousQueryHistoryEnabled;
    jest.restoreAllMocks();
  });

  it('Opens saved queries drawer', async () => {
    setupQueryLibrary();
    await waitForExplore();
    await openQueryLibrary();
  });

  it('Shows add to saved queries button only when the toggle is enabled', async () => {
    setupQueryLibrary();
    await waitForExplore();
    await openQueryHistory();
    await assertQueryHistory(['{"expr":"TEST"}']);
    await assertAddToQueryLibraryButtonExists(true);
  });

  it('Does not show the saved queries button when the toggle is disabled', async () => {
    config.featureToggles.queryLibrary = false;
    setupQueryLibrary();
    await waitForExplore();
    await openQueryHistory();
    await assertQueryHistory(['{"expr":"TEST"}']);
    await assertAddToQueryLibraryButtonExists(false);
    config.featureToggles.queryLibrary = true;
  });

  it('Hides the add-to-query-library button when the query is saved', async () => {
    setupQueryLibrary();
    await waitForExplore();
    await openQueryHistory();
    await assertQueryHistory(['{"expr":"TEST"}']);
    await addQueryHistoryToQueryLibrary();
    await submitAddToQueryLibrary({ title: 'Test' });
    await assertAddToQueryLibraryButtonExists(false);
  });

  // change this to validate the save query is hidden when users doesn't have permissions to save a query
  it('Does not show the saved queries button when the user doesnt have permissions to save a query', async () => {
    mockContextSrv.isEditor = false;
    setupQueryLibrary();
    await waitForExplore();
    await openQueryHistory();
    await assertQueryHistory(['{"expr":"TEST"}']);
    await assertAddToQueryLibraryButtonExists(false);
  });
});
