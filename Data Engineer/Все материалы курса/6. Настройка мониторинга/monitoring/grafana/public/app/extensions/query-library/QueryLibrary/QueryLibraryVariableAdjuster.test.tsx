import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { getTemplateSrv } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { mockBoundingClientRect } from '@grafana/test-utils';
import { QueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { mockSavedQuery, mockQueryLibraryContext } from '../utils/mocks';

import { applyTemplateVariableOverrides, QueryLibraryVariableAdjuster } from './QueryLibraryVariableAdjuster';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getTemplateSrv: jest.fn(),
}));

const mockGetTemplateSrv = getTemplateSrv as jest.MockedFunction<typeof getTemplateSrv>;

type QueryWithExpr = DataQuery & { expr: string };

const withExpr = (expr: string): SavedQuery => {
  const query: DataQuery = mockSavedQuery.query;
  const nextQuery: QueryWithExpr = { ...query, expr };
  return {
    ...mockSavedQuery,
    query: nextQuery,
  };
};

const renderWithContext = (ui: React.ReactElement) => {
  return {
    user: userEvent.setup({ applyAccept: false }),
    ...render(<QueryLibraryContext.Provider value={mockQueryLibraryContext}>{ui}</QueryLibraryContext.Provider>),
  };
};

describe('QueryLibraryVariableAdjuster', () => {
  beforeAll(() => {
    mockBoundingClientRect({ width: 120, height: 120 });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplateSrv.mockReturnValue({
      getVariables: () => [{ name: 'node' }, { name: 'job' }],
    } as ReturnType<typeof getTemplateSrv>);
  });

  it('renders nothing when no unresolved variables exist', () => {
    renderWithContext(
      <QueryLibraryVariableAdjuster query={withExpr('up')} overrides={{}} onChangeOverrides={jest.fn()} />
    );
    expect(screen.queryByText('Substitute your template variables')).not.toBeInTheDocument();
  });

  it('renders the card and a combobox per unresolved variable', () => {
    renderWithContext(
      <QueryLibraryVariableAdjuster query={withExpr('${node}${job}')} overrides={{}} onChangeOverrides={jest.fn()} />
    );

    expect(screen.getByText('Substitute your template variables')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '${node}' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '${job}' })).toBeInTheDocument();
  });

  it('selecting a detected template variable calls onChangeOverrides', async () => {
    const onChangeOverrides = jest.fn();

    const { user } = renderWithContext(
      <QueryLibraryVariableAdjuster query={withExpr('${node}')} overrides={{}} onChangeOverrides={onChangeOverrides} />
    );

    const combo = screen.getByRole('combobox', { name: '${node}' });
    await user.click(combo);
    await user.click(await screen.findByRole('option', { name: /\$\{job\}/ }));

    expect(onChangeOverrides).toHaveBeenCalledWith({ '${node}': '${job}' });
  });

  it('selecting "Custom value" shows input, focuses it, and typing updates overrides', async () => {
    const query = withExpr('${node}');
    const onChangeOverrides = jest.fn();

    const AdjusterWrapper = () => {
      const [overrides, setOverrides] = useState<Record<string, string>>({});
      return (
        <QueryLibraryVariableAdjuster
          query={query}
          overrides={overrides}
          onChangeOverrides={(next) => {
            onChangeOverrides(next);
            setOverrides(next);
          }}
        />
      );
    };

    const { user } = renderWithContext(<AdjusterWrapper />);

    const combo = screen.getByRole('combobox', { name: '${node}' });
    await user.click(combo);
    await user.click(await screen.findByRole('option', { name: 'Custom value' }));

    expect(onChangeOverrides).toHaveBeenCalledWith({ '${node}': '' });

    const input = screen.getByPlaceholderText('Enter custom value');
    expect(input).toHaveFocus();
    await user.type(input, 'hello');

    expect(onChangeOverrides).toHaveBeenLastCalledWith({ '${node}': 'hello' });
  });
});

describe('applyTemplateVariableOverrides', () => {
  const baseQuery: QueryWithExpr = {
    refId: 'A',
    datasource: { type: 'prometheus', uid: 'ds' },
    expr: '${node}',
  } as QueryWithExpr;
  const savedQuery: SavedQuery = { ...mockSavedQuery, query: baseQuery };

  it('does not replace when override is empty/whitespace', () => {
    const { query: result, templateVariablesChanged } = applyTemplateVariableOverrides(savedQuery, {
      '${node}': '   ',
    });

    expect((result as QueryWithExpr).expr).toBe('${node}');
    expect(templateVariablesChanged).toBe(false);
  });

  it('replaces when override is non-empty', () => {
    const { query: result, templateVariablesChanged } = applyTemplateVariableOverrides(savedQuery, {
      '${node}': 'foo',
    });

    expect((result as QueryWithExpr).expr).toBe('foo');
    expect(templateVariablesChanged).toBe(true);
  });
});
