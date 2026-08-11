import { type DataQuery } from '@grafana/schema';
import { variableRegex } from 'app/features/variables/utils';

const isBuiltinVariableMatch = (match: string): boolean => {
  // Built-in variables work in all contexts; unresolved ones shouldn't trigger warnings/errors.
  return match.indexOf('$__') !== -1 || match.indexOf('${__') !== -1 || match.indexOf('$hashKey') !== -1;
};
/**
 * Detects if a query object contains unresolved template variables that require
 * dashboard context to resolve. Built-in variables (like $__interval, $__from, etc.)
 * are ignored since they work in all contexts and don't cause crashes.
 *
 * This is useful for preventing query editors from crashing when they
 * receive literal variable syntax like "${datasource}" instead of resolved values.
 *
 * @param query - The query object to check for template variables
 * @returns true if unresolved user/dashboard template variables are found
 */
export const hasUnresolvedVariables = (query: DataQuery | null | undefined): boolean => {
  return getUnresolvedVariables(query).length > 0;
};

/**
 * Returns all user-defined template variables found in a query object, excluding
 * built-in variables (like $__interval, $__from, etc.) that work in all contexts.
 *
 * @param query - The query object to check for template variables
 * @returns Array of unresolved user/dashboard template variable matches
 */
export const getUnresolvedVariables = (query: DataQuery | null | undefined): string[] => {
  if (!query) {
    return [];
  }

  const queryStr = JSON.stringify(query);
  const re = new RegExp(variableRegex.source, variableRegex.flags);
  const unresolved = new Set<string>();

  for (const m of queryStr.matchAll(re)) {
    const match = m[0];
    if (isBuiltinVariableMatch(match)) {
      continue;
    }
    unresolved.add(match);
  }

  return [...unresolved];
};

const replaceVariablesInString = (input: string, variables: Record<string, string>): string => {
  const re = new RegExp(variableRegex.source, variableRegex.flags);
  return input.replace(re, (match: string) => variables[match] ?? match);
};

const replaceUnresolvedVariablesDeep = <T>(
  value: T,
  variables: Record<string, string>,
  seen: WeakMap<object, unknown>
): T => {
  if (typeof value === 'string') {
    return replaceVariablesInString(value, variables) as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const existing = seen.get(value);
  if (existing !== undefined) {
    return existing as T;
  }

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (const item of value) {
      out.push(replaceUnresolvedVariablesDeep(item, variables, seen));
    }
    return out as T;
  }

  const out: Record<string, unknown> = {};
  seen.set(value, out);

  // Preserve prior behavior of JSON-string replacement by also replacing in object keys.
  // This avoids stringify/parse hazards (e.g. replacement values containing quotes) while
  // keeping substitution semantics consistent.
  for (const [key, v] of Object.entries(value)) {
    const nextKey = replaceVariablesInString(key, variables);
    out[nextKey] = replaceUnresolvedVariablesDeep(v, variables, seen);
  }

  return out as T;
};

export const replaceUnresolvedVariables = (
  query: DataQuery | null | undefined,
  variables: Record<string, string>
): DataQuery => {
  if (!query) {
    return { refId: '' };
  }

  return replaceUnresolvedVariablesDeep(query, variables, new WeakMap());
};
