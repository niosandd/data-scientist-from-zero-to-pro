import { renderHook, act, waitFor, getWrapper } from 'test/test-utils';

import { addExtraMiddleware, addRootReducer } from 'app/store/configureStore';

import { generatedAPI, type AlertEnrichment } from '../../../api/clients/alertenrichment/v1beta1/endpoints.gen';
import { setupEnrichmentMockServer } from '../__mocks__/enrichmentApi';

import {
  useFilteredEnrichments,
  filterEnrichmentsBySearch,
  filterEnrichmentsByScope,
  isGloballyScopedEnrichment,
  filterToGloballyScopedEnrichments,
} from './useEnrichments';

setupEnrichmentMockServer();

beforeAll(() => {
  addRootReducer({
    [generatedAPI.reducerPath]: generatedAPI.reducer,
  });
  addExtraMiddleware(generatedAPI.middleware);
});

describe('useEnrichments', () => {
  it('queries global and rule enrichments when ruleUid is provided', async () => {
    const { result } = renderHook(() => useFilteredEnrichments(1000, 'dev123'), {
      wrapper: getWrapper({}),
    });

    await waitFor(() => {
      expect(result.current.globalEnrichments).toMatchObject([
        { metadata: { name: 'global-enrichment', uid: 'uid-global' } },
      ]);
      expect(result.current.ruleLevelEnrichments).toMatchObject([
        { metadata: { name: 'rule-dev123-enrichment', uid: 'uid-rule-dev123' } },
      ]);
    });

    await act(async () => {
      await result.current.refetch();
    });
  });

  it('skips rule query when ruleUid is undefined', async () => {
    const { result } = renderHook(() => useFilteredEnrichments(1000, undefined), {
      wrapper: getWrapper({}),
    });

    await waitFor(() => {
      expect(result.current.globalEnrichments).toMatchObject([
        { metadata: { name: 'global-enrichment', uid: 'uid-global' } },
      ]);
      expect(result.current.ruleLevelEnrichments).toEqual([]);
    });
  });
});

describe('Phase 2 Step 1: show only globally scoped enrichments in global section', () => {
  it('isGloballyScopedEnrichment returns true only when no labelMatchers and no annotationMatchers', () => {
    const globallyScoped: AlertEnrichment = {
      metadata: { name: 'global' },
      spec: {
        title: 'Global',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        labelMatchers: [],
      },
    };
    expect(isGloballyScopedEnrichment(globallyScoped)).toBe(true);

    const noMatchers: AlertEnrichment = {
      metadata: { name: 'no-matchers' },
      spec: {
        title: 'No matchers',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
      },
    };
    expect(isGloballyScopedEnrichment(noMatchers)).toBe(true);
  });

  it('isGloballyScopedEnrichment returns false when labelMatchers or annotationMatchers are set', () => {
    const labelScoped: AlertEnrichment = {
      metadata: { name: 'label-scoped' },
      spec: {
        title: 'Label scoped',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        labelMatchers: [{ name: 'severity', type: '=', value: 'critical' }],
      },
    };
    expect(isGloballyScopedEnrichment(labelScoped)).toBe(false);

    const annotationScoped: AlertEnrichment = {
      metadata: { name: 'annotation-scoped' },
      spec: {
        title: 'Annotation scoped',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        annotationMatchers: [{ name: 'summary', type: '=', value: 'foo' }],
      },
    };
    expect(isGloballyScopedEnrichment(annotationScoped)).toBe(false);
  });

  it('filterToGloballyScopedEnrichments keeps only scope=global (excludes label- and annotation-scoped)', () => {
    const global: AlertEnrichment = {
      metadata: { name: 'global' },
      spec: {
        title: 'Global',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        labelMatchers: [],
      },
    };
    const labelScoped: AlertEnrichment = {
      metadata: { name: 'label-scoped' },
      spec: {
        title: 'Label scoped',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        labelMatchers: [{ name: 'alertname', type: '=', value: 'HighCPU' }],
      },
    };
    const annotationScoped: AlertEnrichment = {
      metadata: { name: 'annotation-scoped' },
      spec: {
        title: 'Annotation scoped',
        steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
        annotationMatchers: [{ name: 'summary', type: '=', value: 'x' }],
      },
    };
    const result = filterToGloballyScopedEnrichments([global, labelScoped, annotationScoped]);
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('global');
  });
});

describe('filterEnrichmentsBySearch (search by enrichment name)', () => {
  const makeEnrichment = (title: string): AlertEnrichment => ({
    metadata: { name: title.toLowerCase().replace(/\s+/g, '-') },
    spec: {
      title,
      steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
    },
  });

  it('returns all enrichments when query is empty or whitespace', () => {
    const list = [makeEnrichment('CPU Alert'), makeEnrichment('Memory Alert')];
    expect(filterEnrichmentsBySearch(list, '')).toEqual(list);
    expect(filterEnrichmentsBySearch(list, '   ')).toEqual(list);
  });

  it('filters by case-insensitive substring on title', () => {
    const list = [
      makeEnrichment('CPU Alert Enrichment'),
      makeEnrichment('Memory Alert'),
      makeEnrichment('High CPU Usage'),
    ];
    expect(filterEnrichmentsBySearch(list, 'cpu')).toHaveLength(2);
    expect(filterEnrichmentsBySearch(list, 'CPU')).toHaveLength(2);
    expect(filterEnrichmentsBySearch(list, 'memory')).toHaveLength(1);
    expect(filterEnrichmentsBySearch(list, 'alert')).toHaveLength(2);
    expect(filterEnrichmentsBySearch(list, 'nonexistent')).toHaveLength(0);
  });

  it('returns empty array when no enrichments match', () => {
    expect(filterEnrichmentsBySearch([makeEnrichment('Foo')], 'bar')).toEqual([]);
  });
});

describe('filterEnrichmentsByScope (settings page)', () => {
  const ruleScoped: AlertEnrichment = {
    metadata: { name: 'rule' },
    spec: {
      title: 'Rule',
      steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
      alertRuleUids: ['uid-1'],
    },
  };
  const globalScoped: AlertEnrichment = {
    metadata: { name: 'global' },
    spec: {
      title: 'Global',
      steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
    },
  };
  const labelScoped: AlertEnrichment = {
    metadata: { name: 'label' },
    spec: {
      title: 'Label',
      steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
      labelMatchers: [{ name: 'severity', type: '=', value: 'critical' }],
    },
  };
  const annotationScoped: AlertEnrichment = {
    metadata: { name: 'annotation' },
    spec: {
      title: 'Annotation',
      steps: [{ timeout: '30s', type: 'enricher', enricher: { type: 'assign', assign: { annotations: [] } } }],
      annotationMatchers: [{ name: 'summary', type: '=', value: 'foo' }],
    },
  };
  const all = [ruleScoped, globalScoped, labelScoped, annotationScoped];

  it('returns all when scope is empty', () => {
    expect(filterEnrichmentsByScope(all, '')).toHaveLength(4);
  });

  it('filters by rule (has alertRuleUids)', () => {
    const result = filterEnrichmentsByScope(all, 'rule');
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('rule');
  });

  it('filters by global (no rule uids, no matchers)', () => {
    const result = filterEnrichmentsByScope(all, 'global');
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('global');
  });

  it('filters by label (has labelMatchers)', () => {
    const result = filterEnrichmentsByScope(all, 'label');
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('label');
  });

  it('filters by annotation (has annotationMatchers)', () => {
    const result = filterEnrichmentsByScope(all, 'annotation');
    expect(result).toHaveLength(1);
    expect(result[0].metadata?.name).toBe('annotation');
  });
});
