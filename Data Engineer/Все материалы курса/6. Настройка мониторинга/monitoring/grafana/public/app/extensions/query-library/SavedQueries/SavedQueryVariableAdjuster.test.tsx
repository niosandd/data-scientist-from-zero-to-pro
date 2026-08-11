import { useState } from 'react';
import { render, screen } from 'test/test-utils';

import { getTemplateSrv } from '@grafana/runtime';
import { type DataQuery } from '@grafana/schema';
import { mockBoundingClientRect } from '@grafana/test-utils';
import { QueryLibraryContext } from 'app/features/explore/QueryLibrary/QueryLibraryContext';
import { type SavedQuery } from 'app/features/explore/QueryLibrary/types';

import { mockQueryLibraryContext, mockSavedQuery } from '../utils/mocks';

import { applyTemplateVariableOverrides, SavedQueryVariableAdjuster } from './SavedQueryVariableAdjuster';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getTemplateSrv: jest.fn(),
}));

const mockGetTemplateSrv = getTemplateSrv as jest.MockedFunction<typeof getTemplateSrv>;

type QueryWithExpr = DataQuery & { expr: string };

const withExpr = (expr: string): SavedQuery => {
  const query: DataQuery = mockSavedQuery.query;
  const nextQuery: QueryWithExpr = { ...query, expr };
  return { ...mockSavedQuery, query: nextQuery };
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryLibraryContext.Provider value={mockQueryLibraryContext}>{children}</QueryLibraryContext.Provider>
    ),
  });
};

describe('SavedQueryVariableAdjuster', () => {
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
      <SavedQueryVariableAdjuster query={withExpr('up')} overrides={{}} onChangeOverrides={jest.fn()} />
    );
    expect(screen.queryByText('Substitute your template variables')).not.toBeInTheDocument();
  });

  it('renders the card and a combobox per unresolved variable', () => {
    renderWithContext(
      <SavedQueryVariableAdjuster query={withExpr('${node}${job}')} overrides={{}} onChangeOverrides={jest.fn()} />
    );

    expect(screen.getByText('Substitute your template variables')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '${node}' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '${job}' })).toBeInTheDocument();
  });

  it('selecting a template variable option calls onChangeOverrides with that variable', async () => {
    const onChangeOverrides = jest.fn();

    const { user } = renderWithContext(
      <SavedQueryVariableAdjuster query={withExpr('${node}')} overrides={{}} onChangeOverrides={onChangeOverrides} />
    );

    const combo = screen.getByRole('combobox', { name: '${node}' });
    await user.click(combo);
    await user.click(await screen.findByRole('option', { name: /\$\{job\}/ }));

    expect(onChangeOverrides).toHaveBeenCalledWith({ '${node}': '${job}' });
  });

  it('clearing a selection removes the variable from overrides', async () => {
    const onChangeOverrides = jest.fn();

    const { user } = renderWithContext(
      <SavedQueryVariableAdjuster
        query={withExpr('${node}')}
        overrides={{ '${node}': '${job}' }}
        onChangeOverrides={onChangeOverrides}
      />
    );

    const clearButton = screen.getByTitle('Clear value');
    await user.click(clearButton);

    expect(onChangeOverrides).toHaveBeenCalledWith({});
  });

  it('selecting "Custom value" shows input, focuses it, and typing updates overrides', async () => {
    const query = withExpr('${node}');
    const onChangeOverrides = jest.fn();

    const AdjusterWrapper = () => {
      const [overrides, setOverrides] = useState<Record<string, string>>({});
      return (
        <SavedQueryVariableAdjuster
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

  it('renders group with accessible label for screen readers', () => {
    renderWithContext(
      <SavedQueryVariableAdjuster query={withExpr('${node}')} overrides={{}} onChangeOverrides={jest.fn()} />
    );

    expect(screen.getByRole('group', { name: 'Substitute your template variables' })).toBeInTheDocument();
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

  it('replaces when override is a non-empty string', () => {
    const { query: result, templateVariablesChanged } = applyTemplateVariableOverrides(savedQuery, {
      '${node}': 'foo',
    });

    expect((result as QueryWithExpr).expr).toBe('foo');
    expect(templateVariablesChanged).toBe(true);
  });

  it('replaces when override is a template variable reference', () => {
    const { query: result, templateVariablesChanged } = applyTemplateVariableOverrides(savedQuery, {
      '${node}': '${job}',
    });

    expect((result as QueryWithExpr).expr).toBe('${job}');
    expect(templateVariablesChanged).toBe(true);
  });

  it('does not set templateVariablesChanged when override matches the original variable', () => {
    const { query: result, templateVariablesChanged } = applyTemplateVariableOverrides(savedQuery, {
      '${node}': '${node}',
    });

    expect((result as QueryWithExpr).expr).toBe('${node}');
    expect(templateVariablesChanged).toBe(false);
  });
});
