import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom-v5-compat';
import { render } from 'test/test-utils';

import { parseFooterItems, useUrlValues } from './ReportGridRenderer';

function UrlValuesProbe() {
  const values = useUrlValues();

  return <pre data-testid="url-values">{JSON.stringify(values)}</pre>;
}

function renderProbe(path: string) {
  render(
    <Routes>
      <Route path="*" element={<UrlValuesProbe />} />
    </Routes>,
    {
      historyOptions: {
        initialEntries: [path],
      },
    }
  );

  return JSON.parse(screen.getByTestId('url-values').textContent ?? '{}');
}

describe('useUrlValues', () => {
  it('parseFooterItems returns undefined for null or empty input', () => {
    expect(parseFooterItems(null)).toBeUndefined();
    expect(parseFooterItems('')).toBeUndefined();
  });

  it('parseFooterItems parses valid JSON', () => {
    expect(parseFooterItems('[{"type":"pageNumber"},{"type":"logo"}]')).toEqual([
      { type: 'pageNumber' },
      { type: 'logo' },
    ]);
  });

  it('parseFooterItems filters invalid item types', () => {
    expect(parseFooterItems('[{"type":"pageNumber"},{"type":"invalid"}]')).toEqual([{ type: 'pageNumber' }]);
  });

  it('parseFooterItems caps item count at 10', () => {
    const raw = JSON.stringify(Array.from({ length: 20 }, () => ({ type: 'pageNumber' })));
    expect(parseFooterItems(raw)).toHaveLength(10);
  });

  it('parseFooterItems truncates long string fields and drops non-string values', () => {
    const raw = JSON.stringify([
      {
        type: 'fixedText',
        value: 'x'.repeat(1000),
        fontSize: 42,
      },
    ]);
    expect(parseFooterItems(raw)).toEqual([
      {
        type: 'fixedText',
        value: 'x'.repeat(50),
        fontSize: undefined,
      },
    ]);
  });

  it('parseFooterItems only accepts the reduced date format options', () => {
    expect(parseFooterItems('[{"type":"date","value":"MM/dd/yyyy"}]')).toEqual([{ type: 'date', value: 'MM/dd/yyyy' }]);
    expect(parseFooterItems('[{"type":"date","value":"yyyy-MM-dd"}]')).toEqual([{ type: 'date', value: undefined }]);
  });

  it('parseFooterItems returns undefined for invalid or non-array JSON', () => {
    expect(parseFooterItems('not json')).toBeUndefined();
    expect(parseFooterItems('{"type":"pageNumber"}')).toBeUndefined();
  });

  it('parseFooterItems only keeps known fields', () => {
    expect(parseFooterItems('[{"type":"pageNumber","malicious":"xss","__proto__":"bad"}]')).toEqual([
      { type: 'pageNumber' },
    ]);
  });

  it('parseFooterItems converts non-string value fields to undefined', () => {
    expect(parseFooterItems('[{"type":"fixedText","value":42}]')).toEqual([{ type: 'fixedText', value: undefined }]);
  });

  it('defaults all header toggles to true when params are absent', () => {
    const values = renderProbe('/report');

    expect(values.showHeader).toBe(true);
    expect(values.showTimeRange).toBe(true);
    expect(values.showDashboardTitle).toBe(true);
  });

  it('returns false when the header toggle params are set to false', () => {
    const values = renderProbe('/report?pdf.header=false&pdf.timeRange=false&pdf.dashboardTitle=false');

    expect(values.showHeader).toBe(false);
    expect(values.showTimeRange).toBe(false);
    expect(values.showDashboardTitle).toBe(false);
  });

  it('returns true when a header toggle param is set to true', () => {
    const values = renderProbe('/report?pdf.header=true');

    expect(values.showHeader).toBe(true);
  });

  it('handles malformed scale params gracefully', () => {
    const values = renderProbe('/report?scale=not-a-number');

    expect(values.scaleFactor).toBe(1);
  });

  it('reads footer values from URL params', () => {
    const values = renderProbe(
      '/report?pdf.footerItems=%5B%7B%22type%22%3A%22pageNumber%22%7D%5D&pdf.footerFontFamily=Helvetica'
    );

    expect(values.footerItems).toEqual([{ type: 'pageNumber' }]);
    expect(values.footerFontFamily).toBe('Helvetica');
  });

  it('returns undefined footer values when params are absent', () => {
    const values = renderProbe('/report');

    expect(values.footerItems).toBeUndefined();
    expect(values.footerFontFamily).toBeUndefined();
  });

  it.each([
    ['/report?pdf.tables=true', true],
    ['/report', false],
  ])('parses pdf.tables from %s as %s', (path, expected) => {
    expect(renderProbe(path).pdfTables).toBe(expected);
  });
});
