import { type DateTime, type SelectableValue, type TimeRange } from '@grafana/data';
import { type DashboardPickerDTO } from 'app/core/components/Select/DashboardPicker';

export interface ReportsState {
  reports: Report[];
  report: Report;
  hasFetchedList: boolean;
  hasFetchedSingle: boolean;
  searchQuery: string;
  reportCount: number;
  isLoading: boolean;
  testEmailIsSending?: boolean;
  isDownloadingCSV?: boolean;
  lastUid?: string;
  isUpdated?: boolean;
  visitedSteps: StepKey[];
}

export type ReportDashboard = {
  dashboard?: {
    uid: string;
    name: string;
  };
  reportVariables?: Record<string, string[]>;
  timeRange: ReportTimeRange;
};

export interface Report<Vars = Record<string, string[]>> {
  id: number;
  name: string;
  subject?: string;
  schedule: SchedulingOptions;
  dashboardId?: number;
  dashboardUid?: string;
  dashboardName?: string;
  recipients: string;
  message: string;
  replyTo: string;
  formats: ReportFormat[];
  options: ReportOptions;
  templateVars?: Vars;
  enableDashboardUrl?: boolean;
  state: ReportState;
  dashboards: ReportDashboard[];
  scaleFactor?: number;
  pdfShowTemplateVariables?: boolean;
}

interface ReportBase<Vars = Record<string, string[]>> {
  id?: number;
  name: string;
  subject?: string;
  dashboardId?: number;
  dashboardUid?: string;
  recipients: string;
  replyTo: string;
  message: string;
  formats: ReportFormat[];
  options: ReportOptions;
  templateVars?: Vars;
  enableDashboardUrl?: boolean;
  state?: ReportState;
  dashboards?: ReportDashboard[];
  scaleFactor?: number;
}

export interface ReportDTO extends ReportBase {
  schedule: SchedulingOptions;
}

export interface ReportFormData extends ReportBase<Record<string, Array<SelectableValue<string>>>> {
  schedule: SchedulingData;
  dashboard: DashboardPickerDTO;
}

export enum ReportSchedulingFrequency {
  Monthly = 'monthly',
  Weekly = 'weekly',
  Daily = 'daily',
  Hourly = 'hourly',
  Never = 'never',
  Custom = 'custom',
  Once = 'once',
}

export enum ReportIntervalFrequency {
  Hours = 'hours',
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
}

export type FooterItemType = 'pageNumber' | 'date' | 'fixedText' | 'logo' | 'flexSpacer';
export const FOOTER_ITEM_TYPES: readonly FooterItemType[] = ['pageNumber', 'date', 'fixedText', 'logo', 'flexSpacer'];

export const MAX_FOOTER_ITEMS = 10;
export const MAX_FIXED_TEXT_LENGTH = 50;
export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
export const DATE_FORMAT_OPTIONS = [DEFAULT_DATE_FORMAT, 'MM/dd/yyyy', 'MM/yyyy'] as const;

export interface FooterItem {
  type: FooterItemType;
  value?: string;
  fontSize?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
}

export enum FooterMode {
  Default = '',
  SentBy = 'sent-by',
  None = 'none',
}

export enum ReportState {
  Paused = 'paused',
  Scheduled = 'scheduled',
  Expired = 'expired',
  Draft = 'draft',
  Never = 'not scheduled',
}

export type ReportTime = {
  hour: number;
  minute: number;
};

export interface SchedulingOptions {
  frequency: ReportSchedulingFrequency;
  dayOfMonth?: string;
  timeZone: string;
  startDate?: string;
  endDate?: string;
  intervalFrequency?: ReportIntervalFrequency;
  intervalAmount?: number;
  workdaysOnly?: boolean;
}

export interface SchedulingData {
  frequency: ReportSchedulingFrequency;
  dayOfMonth?: string;
  time?: ReportTime;
  endTime?: ReportTime;
  timeZone: string;
  startDate?: Date | string;
  endDate?: Date | string;
  intervalFrequency?: ReportIntervalFrequency;
  intervalAmount?: string;
  workdaysOnly?: boolean;
  sendTime: 'later' | 'now' | '';
}

export type ReportOrientation = 'portrait' | 'landscape';

export type ReportLayout = 'simple' | 'grid';

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  Image = 'image',
  PDFTables = 'pdf-tables',
  PDFTablesAppendix = 'pdf-tables-appendix',
}

export type CSVEncoding = 'utf-8' | 'utf-16le' | 'utf-8-bom';

export const csvEncodingOptions = [
  {
    value: 'utf-8',
    label: 'UTF-8 (Recommended)',
    description: 'Recommended for most users',
  },
  {
    value: 'utf-16le',
    label: 'UTF-16LE (Excel compatibility mode)',
    description: 'Compatible with most Excel versions',
  },
  {
    value: 'utf-8-bom',
    label: 'UTF-8-BOM (Legacy)',
    description: 'Use if you experience issues with UTF-8',
  },
];

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

interface BrandingOptions {
  reportLogoUrl: string;
  emailLogoUrl: string;
  emailFooterMode: FooterMode;
  emailFooterText: string;
  emailFooterLink: string;
}

export interface ReportsSettings {
  pdfTheme: string;
  embeddedImageTheme: string;
  pdfHeaderEnabled: boolean;
  pdfTimeRangeEnabled: boolean;
  pdfDashboardTitleEnabled: boolean;
  footerItems: FooterItem[];
  footerFontFamily: string;
  branding: BrandingOptions;
}

interface ReportOptions {
  orientation: ReportOrientation;
  layout: ReportLayout;
  timeRange?: ReportTimeRange;
  pdfShowTemplateVariables: boolean;
  pdfCombineOneFile: boolean;
  csvEncoding?: CSVEncoding;
}

export interface ReportTimeRange {
  from: string;
  to: string;
  raw?: ReportTimeRange;
}

export const reportOrientations: Array<SelectableValue<ReportOrientation>> = [
  { value: 'landscape', label: 'Landscape', icon: 'gf-landscape' },
  { value: 'portrait', label: 'Portrait', icon: 'gf-portrait' },
];

export const reportLayouts: Array<SelectableValue<ReportLayout>> = [
  { value: 'grid', label: 'Grid', icon: 'table' },
  { value: 'simple', label: 'Simple', icon: 'gf-layout-simple' },
];

export enum StepKey {
  SelectDashboard = 'select-dashboard',
  FormatReport = 'format-report',
  Schedule = 'schedule',
  Share = 'share',
  Confirm = 'confirm',
}

export type FormRequiredFields = Array<{
  step: StepKey;
  fields: Array<keyof Report>;
}>;

export type ReportDataToRender = Array<{
  title: string;
  id: StepKey;
  items: Array<{
    title: string;
    value: React.ReactNode;
    id?: keyof Report;
    required?: boolean;
  }>;
}>;

export const LAST_DAY_OF_MONTH = 'last';

// the following types are for report redesign and will remain after old arch removal
export enum ReportSchedulingFrequencyV2 {
  Monthly = 'monthly',
  Weekly = 'weekly',
  Daily = 'daily',
  Hourly = 'hourly',
  Custom = 'custom',
  Once = 'once',
}

export enum SendTime {
  Later = 'later',
  Now = 'now',
}

export interface ReportSchedule {
  sendTime: SendTime;
  startDate?: Date;
  endDate?: Date;
  startTime?: DateTime;
  endTime?: DateTime;
  timeZone: string;
  frequency: ReportSchedulingFrequencyV2;
  intervalFrequency?: ReportIntervalFrequency;
  intervalAmount?: number;
  lastDayOfMonthOnly?: boolean;
  workdaysOnly?: boolean;
}

interface ReportPDFOptions {
  orientation: ReportOrientation;
  layout: ReportLayout;
  scaleFactor: number;
  dashboardPDF?: {
    showTemplateVariables: boolean;
    combineOneFile: boolean;
    addPDFTablesAppendix: boolean;
  };
}

interface ReportCSVOptions {
  encoding?: CSVEncoding;
}

export interface ReportV2 extends ReportBaseV2 {
  id?: number;
  state: ReportState;
  dashboards: ReportDashboardV2[];
}

// Report form
export interface ReportFormV2 extends ReportBaseV2 {
  dashboards: ReportFormDashboard[];
}

interface ReportDashboardV2 {
  uid?: string;
  title?: string;
  timeRange: ReportTimeRange;
  variables?: Record<string, string[]>;
}

export interface ReportFormDashboard {
  uid?: string;
  key?: string;
  timeRange: TimeRange;
}

export interface ReportBaseV2 {
  title: string;
  schedule: ReportSchedule;
  subject?: string;
  message: string;
  replyTo?: string;
  recipients: string[];
  attachments: AttachmentOptions;
  pdfOptions?: ReportPDFOptions;
  csvOptions?: ReportCSVOptions;
  addDashboardUrl: boolean;
  addDashboardImage: boolean;
}

interface AttachmentOptions {
  pdf: boolean;
  csv: boolean;
  pdfTables: boolean;
  csvEncoding?: CSVEncoding;
}

interface ReportScheduleDTOV2 {
  frequency: ReportSchedulingFrequencyV2;
  dayOfMonth?: string;
  timeZone: string;
  startDate?: string;
  endDate?: string;
  intervalFrequency?: ReportIntervalFrequency;
  intervalAmount?: number;
  workdaysOnly?: boolean;
}

// Same values as ReportBase but without some deprecated fields.
// Old API schema
interface ReportBaseDTO {
  id: number;
  name: string;
  subject?: string;
  recipients: string;
  replyTo: string;
  message: string;
  formats: ReportFormat[];
  options: ReportOptions;
  enableDashboardUrl?: boolean;
  state: ReportState;
  dashboards: ReportDashboard[];
  scaleFactor?: number;
}

// For GET/UPDATE API
export interface ReportDTOV2 extends ReportBaseDTO {
  schedule: ReportScheduleDTOV2;
}

// For POST API
export interface CreateReportDTOV2 extends Omit<ReportBaseDTO, 'id'> {
  schedule: ReportScheduleDTOV2;
}

// All fields are optional
export type DraftReportDTOV2 = Partial<ReportDTOV2>;
