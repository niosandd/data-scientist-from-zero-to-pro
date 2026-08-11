import { getUnresolvedVariables, hasUnresolvedVariables, replaceUnresolvedVariables } from './templateVariables';

describe('hasUnresolvedVariables', () => {
  it('detects user variables in queries from datasources like cardinality query', () => {
    const cardinalityQuery = {
      refId: 'A',
      datasource: {
        type: 'cardinality-datasource',
        uid: 'sample-cardinality-management',
      },
      cardinalityType: 'metrics',
      limit: '100',
      refreshQueryWhenFilterChanges: '${filter}',
      resultType: 'top',
      selector: '',
      targetDatasource: '${datasource}',
    };

    expect(hasUnresolvedVariables(cardinalityQuery)).toBe(true);
  });

  it('detects $variable syntax in prometheus query', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{instance=~"$instance"}',
    };

    expect(hasUnresolvedVariables(promQuery)).toBe(true);
  });

  it('detects [[variable]] syntax in prometheus query', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job=[[job]]}[5m])',
    };

    expect(hasUnresolvedVariables(promQuery)).toBe(true);
  });

  it('returns false for query without variables', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{job="api-server"}',
    };

    expect(hasUnresolvedVariables(promQuery)).toBe(false);
  });

  it('returns false for queries not using variables in datasources like cardinality', () => {
    const cardinalityQuery = {
      refId: 'A',
      datasource: {
        type: 'grafanacloud-cardinality-datasource',
        uid: 'grafanacloud-sample-cardinality-management',
      },
      cardinalityType: 'metrics',
      limit: '100',
      refreshQueryWhenFilterChanges: 'false',
      resultType: 'top',
      selector: '',
      targetDatasource: 'prometheus-uid',
    };

    expect(hasUnresolvedVariables(cardinalityQuery)).toBe(false);
  });

  it('ignores built-in variables (should return false)', () => {
    const promQueryWithBuiltins = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total[$__interval])',
      interval: '${__interval_ms}',
      maxDataPoints: '$__maxDataPoints',
    };

    expect(hasUnresolvedVariables(promQueryWithBuiltins)).toBe(false);
  });

  it('detects user variables even when mixed with built-in variables', () => {
    const mixedQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job="$job"}[$__interval])',
      timeRange: { from: '$__from', to: '$__to' },
    };

    expect(hasUnresolvedVariables(mixedQuery)).toBe(true);
  });
});

describe('getUnresolvedVariables', () => {
  it('returns empty array for null query', () => {
    expect(getUnresolvedVariables(null)).toEqual([]);
  });

  it('returns empty array for undefined query', () => {
    expect(getUnresolvedVariables(undefined)).toEqual([]);
  });

  it('returns empty array for query without variables', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{job="api-server"}',
    };

    expect(getUnresolvedVariables(promQuery)).toEqual([]);
  });

  it('returns array of unresolved variables for $variable syntax', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{instance=~"$instance"}',
    };

    const result = getUnresolvedVariables(promQuery);
    expect(result).toContain('$instance');
  });

  it('returns array of unresolved variables for ${variable} syntax', () => {
    const query = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job="${job}"}[5m])',
    };

    const result = getUnresolvedVariables(query);
    expect(result).toContain('${job}');
  });

  it('returns array of unresolved variables for [[variable]] syntax', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job=[[job]]}[5m])',
    };

    const result = getUnresolvedVariables(promQuery);
    expect(result).toContain('[[job]]');
  });

  it('filters out built-in variables starting with $__', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total[$__interval])',
      interval: '$__interval_ms',
    };

    const result = getUnresolvedVariables(promQuery);
    expect(result).not.toContain('$__interval');
    expect(result).not.toContain('$__interval_ms');
  });

  it('filters out built-in variables starting with ${__', () => {
    const promQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      interval: '${__interval_ms}',
    };

    const result = getUnresolvedVariables(promQuery);
    expect(result).not.toContain('${__interval_ms}');
  });

  it('filters out $hashKey variable', () => {
    const query = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      $hashKey: 'some-hash',
    };

    const result = getUnresolvedVariables(query);
    expect(result).not.toContain('$hashKey');
  });

  it('returns multiple unresolved variables', () => {
    const query = {
      refId: 'A',
      datasource: { uid: '${datasource}', type: 'prometheus' },
      expr: 'up{instance=~"$instance", job="${job}"}',
    };

    const result = getUnresolvedVariables(query);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result).toContain('${datasource}');
    expect(result).toContain('$instance');
    expect(result).toContain('${job}');
  });

  it('returns only user variables when mixed with built-in variables', () => {
    const mixedQuery = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job="$job"}[$__interval])',
      timeRange: { from: '$__from', to: '$__to' },
    };

    const result = getUnresolvedVariables(mixedQuery);
    expect(result).toContain('$job');
    expect(result).not.toContain('$__interval');
    expect(result).not.toContain('$__from');
    expect(result).not.toContain('$__to');
  });
});

describe('replaceUnresolvedVariables', () => {
  it('returns default query for null query', () => {
    const result = replaceUnresolvedVariables(null, {});
    expect(result).toEqual({ refId: '' });
  });

  it('returns default query for undefined query', () => {
    const result = replaceUnresolvedVariables(undefined, {});
    expect(result).toEqual({ refId: '' });
  });

  it('replaces $variable syntax with provided value', () => {
    const query = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{instance=~"$instance"}',
    };

    const variables = { $instance: 'localhost:9090' };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('localhost:9090');
    expect(JSON.stringify(result)).not.toContain('$instance');
  });

  it('replaces ${variable} syntax with provided value', () => {
    const query = {
      refId: 'A',
      datasource: { uid: '${datasource}', type: 'prometheus' },
      expr: 'rate(http_requests_total{job="${job}"}[5m])',
    };

    const variables = {
      '${datasource}': 'Prometheus0',
      '${job}': 'api-server',
    };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('Prometheus0');
    expect(JSON.stringify(result)).toContain('api-server');
    expect(JSON.stringify(result)).not.toContain('${datasource}');
    expect(JSON.stringify(result)).not.toContain('${job}');
  });

  it('replaces [[variable]] syntax with provided value', () => {
    const query = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'rate(http_requests_total{job=[[job]]}[5m])',
    };

    const variables = { '[[job]]': 'api-server' };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('api-server');
    expect(JSON.stringify(result)).not.toContain('[[job]]');
  });

  it('leaves variables unchanged if not in replacement map', () => {
    const query = {
      refId: 'A',
      datasource: { uid: 'prometheus', type: 'prometheus' },
      expr: 'up{instance=~"$instance", job="${job}"}',
    };

    const variables = { $instance: 'localhost:9090' };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('localhost:9090');
    expect(JSON.stringify(result)).toContain('${job}');
  });

  it('replaces multiple variables in the same query', () => {
    const query = {
      refId: 'A',
      datasource: { uid: '${datasource}', type: 'prometheus' },
      expr: 'up{instance=~"$instance", job="${job}"}',
    };

    const variables = {
      '${datasource}': 'Prometheus0',
      $instance: 'localhost:9090',
      '${job}': 'api-server',
    };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('Prometheus0');
    expect(JSON.stringify(result)).toContain('localhost:9090');
    expect(JSON.stringify(result)).toContain('api-server');
  });

  it('preserves query structure after replacement', () => {
    const query = {
      refId: 'A',
      datasource: { uid: '${datasource}', type: 'prometheus' },
      expr: 'up{instance=~"$instance"}',
      interval: '5m',
    };

    const variables = {
      '${datasource}': 'Prometheus0',
      $instance: 'localhost:9090',
    };
    const result = replaceUnresolvedVariables(query, variables);

    expect(result.refId).toBe('A');
    const resultStr = JSON.stringify(result);
    expect(resultStr).toContain('5m');
    expect(resultStr).toContain('"type":"prometheus"');
  });

  it('handles nested objects with variables', () => {
    const query = {
      refId: 'A',
      datasource: { uid: '${datasource}', type: 'prometheus' },
      options: {
        legend: { displayMode: '${displayMode}' },
      },
    };

    const variables = {
      '${datasource}': 'Prometheus0',
      '${displayMode}': 'table',
    };
    const result = replaceUnresolvedVariables(query, variables);

    expect(JSON.stringify(result)).toContain('Prometheus0');
    expect(JSON.stringify(result)).toContain('table');
    expect(JSON.stringify(result)).not.toContain('${datasource}');
    expect(JSON.stringify(result)).not.toContain('${displayMode}');
  });

  it('does not break when replacement values contain quotes (including in keys)', () => {
    const query = {
      refId: 'A',
      '${job}': {
        label: '${job}',
      },
    };

    const variables = {
      '${job}': 'api"',
    };

    const result: any = replaceUnresolvedVariables(query, variables);

    // Key replacement should be safe (would have broken JSON.parse previously).
    expect(result['api"']).toBeDefined();
    expect(result['api"'].label).toBe('api"');
    expect(result['${job}']).toBeUndefined();
  });
});
