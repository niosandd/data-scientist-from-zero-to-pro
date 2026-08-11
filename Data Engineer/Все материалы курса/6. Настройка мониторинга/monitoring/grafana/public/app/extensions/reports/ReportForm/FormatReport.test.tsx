import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { reportInteraction } from '@grafana/runtime';
import { getRouteComponentProps } from 'app/core/navigation/mocks/routeProps';
import { addRootReducer } from 'app/store/configureStore';

import { mockToolkitActionCreator } from '../../../../test/core/redux/mocks';
import { type ReportDashboard, ReportFormat } from '../../types';
import reportsReducers, { initialState, updateReportProp } from '../state/reducers';

import { FormatReport, type Props } from './FormatReport';

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock('app/core/services/context_srv', () => {
  return {
    contextSrv: {
      ...jest.requireActual('app/core/services/context_srv').contextSrv,
      hasPermission: () => true,
    },
  };
});

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    buildInfo: {
      edition: 'Enterprise',
      version: '9.0.0',
      commit: 'abc123',
      env: 'dev',
      latestVersion: '',
      hasUpdate: false,
      hideVersion: false,
    },
    licenseInfo: {
      enabledFeatures: { 'reports.email': true },
    },
    featureToggles: {
      accesscontrol: true,
      pdfTables: true,
    },
    rendererAvailable: true,
  },
  reportInteraction: jest.fn(),
}));

jest.mock('../utils/renderer', () => {
  return {
    getRendererMajorVersion: () => 4,
  };
});

const blankReport = initialState.report;
const mockUpdate = mockToolkitActionCreator(updateReportProp);
const setup = (propOverrides?: Partial<Props>) => {
  addRootReducer(reportsReducers);
  const props: Props = {
    isDownloadingCSV: false,
    downloadCSV(reportTitle: string, reportDashboards: ReportDashboard[]): void {},
    ...getRouteComponentProps(),
    report: blankReport,
    updateReportProp: mockUpdate,
    ...propOverrides,
  };

  render(
    <TestProvider>
      <FormatReport {...props} />
    </TestProvider>
  );
};

describe('FormatReport', () => {
  it('should render with default values selected', () => {
    setup();

    expect(screen.getByText(/2\. format report/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /attach the report as a pdf/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /embed a dashboard image in the email/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /attach a csv file of table panel data/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /landscape/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /grid/i })).toBeChecked();
  });

  it('should submit correct form data', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /embed a dashboard image in the email/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /attach a csv file of table panel data/i }));
    await userEvent.click(screen.getByRole('radio', { name: /portrait/i }));
    await userEvent.click(screen.getByRole('radio', { name: /simple/i }));

    await userEvent.click(screen.getByRole('button', { name: /next:/i }));
    expect(mockUpdate).toHaveBeenCalledWith({
      ...blankReport,
      options: { ...blankReport.options, orientation: 'portrait', layout: 'simple', csvEncoding: 'utf-8' },
      formats: [ReportFormat.PDF, ReportFormat.Image, ReportFormat.CSV],
    });
  });

  it(' not display styling options if PDF format is not selected', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /attach the report as a pdf/i }));
    expect(screen.queryByRole('radio', { name: /landscape/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /portrait/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /grid/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /simple/i })).not.toBeInTheDocument();
  });

  it('should save correct format', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: /portrait/i }));
    await userEvent.click(screen.getByRole('radio', { name: /simple/i }));
    await userEvent.click(screen.getByRole('button', { name: /next:/i }));
    expect(mockUpdate).toHaveBeenCalledWith({
      ...blankReport,
      options: { ...blankReport.options, orientation: 'portrait', layout: 'simple', csvEncoding: 'utf-8' },
      formats: [ReportFormat.PDF],
    });
  });

  describe('reports interactions', () => {
    it('when toggling the "Include table data as PDF appendix" checkbox', async () => {
      setup();

      const pdfTablesAppendixCheckbox = screen.getByTestId(
        'data-testid report form checkbox format pdf-tables-appendix'
      );

      await userEvent.click(pdfTablesAppendixCheckbox);
      expect(reportInteraction).toHaveBeenCalledWith('reports_pdf_table_merge_appendix', { checked: true });

      await userEvent.click(pdfTablesAppendixCheckbox);
      expect(reportInteraction).toHaveBeenCalledWith('reports_pdf_table_merge_appendix', { checked: false });
    });

    it('when toggling the "Attach a separate PDF of table data" checkbox', async () => {
      setup();

      const pdfTablesCheckbox = screen.getByTestId('data-testid report form checkbox format pdf-tables');

      await userEvent.click(pdfTablesCheckbox);
      expect(reportInteraction).toHaveBeenCalledWith('reports_pdf_table_attach_separate', { checked: true });

      await userEvent.click(pdfTablesCheckbox);
      expect(reportInteraction).toHaveBeenCalledWith('reports_pdf_table_attach_separate', { checked: false });
    });
  });

  describe('CSV encoding', () => {
    it('should not display CSV encoding field when CSV is not selected', () => {
      setup();

      expect(screen.queryByText(/csv encoding/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/choose encoding format for csv files/i)).not.toBeInTheDocument();
    });

    it('should display CSV encoding field when CSV is selected', async () => {
      setup();

      await userEvent.click(screen.getByRole('checkbox', { name: /attach a csv file of table panel data/i }));

      expect(await screen.findByText(/csv encoding/i)).toBeInTheDocument();
      expect(screen.getByText(/choose encoding format for csv files/i)).toBeInTheDocument();
    });

    it('should submit form with default CSV encoding when selected', async () => {
      setup();

      await userEvent.click(screen.getByRole('checkbox', { name: /attach a csv file of table panel data/i }));
      await userEvent.click(screen.getByRole('button', { name: /next:/i }));

      expect(mockUpdate).toHaveBeenCalledWith({
        ...blankReport,
        options: { ...blankReport.options, csvEncoding: 'utf-8' },
        formats: [ReportFormat.PDF, ReportFormat.CSV],
      });
    });
  });
});
