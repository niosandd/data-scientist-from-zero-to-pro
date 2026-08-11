import { CoreApp } from '@grafana/data';
import { type QueryLibraryDrawerOptions } from 'app/features/explore/QueryLibrary/QueryLibraryContext';

import { getQueryLibraryDrawerAction, getQueryLibraryRenderContext, parseQueryLibraryRenderContext } from './index';

describe('getQueryLibraryRenderContext', () => {
  it.each([
    [CoreApp.Explore, CoreApp.Explore],
    [CoreApp.PanelEditor, CoreApp.PanelEditor],
    [CoreApp.Dashboard, CoreApp.Dashboard],
    [CoreApp.Unknown, CoreApp.Unknown],
    ['drilldown', 'drilldown'],
    ['anything else', CoreApp.Unknown],
    [undefined, CoreApp.Unknown],
  ])('should return %sa when app is %s', (context: string | undefined, expected: string) => {
    const result = getQueryLibraryRenderContext(context);
    expect(result).toBe(expected);
  });
});

describe('parseQueryLibraryRenderContext', () => {
  it.each([
    [CoreApp.PanelEditor, CoreApp.PanelEditor],
    [CoreApp.Explore, CoreApp.Explore],
    ['rich-history', CoreApp.Explore],
    [undefined, CoreApp.Explore],
  ])('should return %s when context is %s', (context: string | undefined, expected: string) => {
    const result = parseQueryLibraryRenderContext(context);
    expect(result).toBe(expected);
  });
});

describe('getQueryLibraryDrawerAction', () => {
  it('should return "save" when query is provided', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {
      query: { refId: 'A', expr: 'up' } as any,
    };
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('save');
  });

  it('should return "replace" when options.isReplacingQuery is true', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {
      options: { isReplacingQuery: true },
    };
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('replace');
  });

  it('should return "edit" when options.highlightQuery is provided', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {
      options: { highlightQuery: 'query-uid-123' },
    };
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('edit');
  });

  it('should return "add" when no query or options are provided', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {};
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('add');
  });

  it('should prioritize "save" over other options', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {
      query: { refId: 'A', expr: 'up' } as any,
      options: { isReplacingQuery: true, highlightQuery: 'query-uid-123' },
    };
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('save');
  });

  it('should prioritize "replace" over "edit"', () => {
    const options: Pick<QueryLibraryDrawerOptions, 'query' | 'options'> = {
      options: { isReplacingQuery: true, highlightQuery: 'query-uid-123' },
    };
    const result = getQueryLibraryDrawerAction(options);
    expect(result).toBe('replace');
  });
});
