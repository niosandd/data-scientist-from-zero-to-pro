import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom-v5-compat';
import { render } from 'test/test-utils';

import { type FooterItem } from '../../types';
import { defaultReportLogo } from '../constants';

import ReportFooter, { formatDate, getTextItemStyle } from './ReportFooter';

function renderFooter({
  path = '/report',
  footerItems,
  footerFontFamily,
  currentPage = 1,
  totalPageCount = 1,
}: {
  path?: string;
  footerItems?: FooterItem[];
  footerFontFamily?: string;
  currentPage?: number;
  totalPageCount?: number;
} = {}) {
  render(
    <Routes>
      <Route
        path="*"
        element={
          <ReportFooter
            scaleFactor={1}
            currentPage={currentPage}
            totalPageCount={totalPageCount}
            footerItems={footerItems}
            footerFontFamily={footerFontFamily}
          />
        }
      />
    </Routes>,
    {
      historyOptions: {
        initialEntries: [path],
      },
    }
  );
}

describe('formatDate', () => {
  it('formats with a valid pattern', () => {
    expect(formatDate('yyyy')).toMatch(/^\d{4}$/);
  });

  it('falls back when the pattern is invalid', () => {
    expect(formatDate('invalid [')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('getTextItemStyle', () => {
  it('uses the global font family when no per-item override exists', () => {
    expect(getTextItemStyle({ type: 'fixedText', value: 'test' }, 1, 'Helvetica').fontFamily).toBe('Helvetica');
  });
});

describe('ReportFooter', () => {
  it('falls back to the default logo when reportLogo is absent or empty', () => {
    renderFooter({ path: '/report?reportLogo=' });

    expect(screen.getByAltText(/report logo/i)).toHaveAttribute('src', defaultReportLogo);
  });

  it('uses the stored upload path when reportLogo points to an uploaded file', () => {
    renderFooter({ path: '/report?reportLogo=reportLogo.png' });

    expect(screen.getByAltText(/report logo/i)).toHaveAttribute('src', 'api/reports/images/reportLogo.png');
  });

  it('renders the legacy footer when footerItems is undefined', () => {
    renderFooter({ currentPage: 1, totalPageCount: 3 });

    expect(screen.getByText(/Page 1\/3/)).toBeInTheDocument();
    expect(screen.getByAltText(/report logo/i)).toBeInTheDocument();
  });

  it('renders the legacy footer when footerItems is empty', () => {
    renderFooter({ footerItems: [], currentPage: 2, totalPageCount: 5 });

    expect(screen.getByText(/Page 2\/5/)).toBeInTheDocument();
  });

  it('renders individual footer item types', () => {
    renderFooter({
      footerItems: [
        { type: 'pageNumber' },
        { type: 'fixedText', value: 'CONFIDENTIAL' },
        { type: 'date', value: 'MM/yyyy' },
        { type: 'flexSpacer' },
        { type: 'logo', value: '48' },
      ],
      currentPage: 3,
      totalPageCount: 10,
    });

    expect(screen.getByText(/Page 3\/10/)).toBeInTheDocument();
    expect(screen.getByText('CONFIDENTIAL')).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}\/\d{4}$/)).toBeInTheDocument();
    expect(screen.getByAltText(/report logo/i)).toHaveStyle({ height: '48px' });
  });

  it('renders items in order and applies the global font family', () => {
    renderFooter({
      footerItems: [
        { type: 'fixedText', value: 'LEFT' },
        { type: 'flexSpacer' },
        { type: 'fixedText', value: 'RIGHT' },
      ],
      footerFontFamily: 'Georgia',
    });

    expect(screen.getByText('LEFT')).toHaveStyle({ fontFamily: 'Georgia' });
    expect(screen.getByText('RIGHT')).toBeInTheDocument();
  });

  it('applies per-item style overrides', () => {
    renderFooter({
      footerItems: [
        {
          type: 'fixedText',
          value: 'Styled',
          fontSize: '18',
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: '#FF0000',
        },
      ],
    });

    expect(screen.getByText('Styled')).toHaveStyle({
      fontSize: '18px',
      fontWeight: '700',
      fontStyle: 'italic',
      color: '#FF0000',
    });
  });
});
