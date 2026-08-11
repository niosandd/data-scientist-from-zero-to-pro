import { css } from '@emotion/css';
import { format } from 'date-fns/format';
import { type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { useStyles2, useTheme2 } from '@grafana/ui';

import { getResourceUrl } from '../../shared/utils/data';
import { DEFAULT_DATE_FORMAT, type FooterItem } from '../../types';
import { defaultReportLogo } from '../constants';

interface FooterProps {
  scaleFactor: number;
  currentPage: number;
  totalPageCount: number;
  footerItems?: FooterItem[];
  footerFontFamily?: string;
}

export function formatDate(pattern: string): string {
  try {
    return format(new Date(), pattern);
  } catch {
    return format(new Date(), DEFAULT_DATE_FORMAT);
  }
}

export function getTextItemStyle(
  item: FooterItem,
  scaleFactor: number,
  globalFontFamily: string | undefined
): CSSProperties {
  const baseFontSize = `${0.85 * scaleFactor}rem`;

  return {
    fontFamily: globalFontFamily || undefined,
    fontSize: item.fontSize ? `${item.fontSize}px` : baseFontSize,
    fontWeight: item.fontWeight === 'bold' ? 700 : 400,
    fontStyle: item.fontStyle === 'italic' ? 'italic' : undefined,
    color: item.color || undefined,
    whiteSpace: 'nowrap',
  };
}

function ReportFooter({ scaleFactor, currentPage, totalPageCount, footerItems, footerFontFamily }: FooterProps) {
  const styles = useStyles2((theme) => getStyles(theme, scaleFactor));
  const reportLogoUrl = useReportLogoUrl();

  if (!footerItems || footerItems.length === 0) {
    return (
      <LegacyFooter
        scaleFactor={scaleFactor}
        currentPage={currentPage}
        totalPageCount={totalPageCount}
        reportLogoUrl={reportLogoUrl}
      />
    );
  }

  return (
    <div className={styles.footer}>
      {footerItems.map((item, index) => (
        <FooterItemRenderer
          key={index}
          item={item}
          scaleFactor={scaleFactor}
          currentPage={currentPage}
          totalPageCount={totalPageCount}
          reportLogoUrl={reportLogoUrl}
          footerFontFamily={footerFontFamily}
        />
      ))}
    </div>
  );
}

function LegacyFooter({
  scaleFactor,
  currentPage,
  totalPageCount,
  reportLogoUrl,
}: {
  scaleFactor: number;
  currentPage: number;
  totalPageCount: number;
  reportLogoUrl: string;
}) {
  const styles = useStyles2((theme) => getLegacyStyles(theme, scaleFactor));

  return (
    <div className={styles.footer}>
      <div className={styles.pageCount}>
        <Trans i18nKey="reporting.report-footer.page-pagination">
          Page {{ currentPage }}/{{ totalPageCount }}
        </Trans>
      </div>
      <div className={styles.logo}>
        <img
          className={styles.logoImg}
          src={reportLogoUrl}
          alt={t('reporting.report-footer.logo-alt', 'Report logo')}
        />
      </div>
    </div>
  );
}

function FooterItemRenderer({
  item,
  scaleFactor,
  currentPage,
  totalPageCount,
  reportLogoUrl,
  footerFontFamily,
}: {
  item: FooterItem;
  scaleFactor: number;
  currentPage: number;
  totalPageCount: number;
  reportLogoUrl: string;
  footerFontFamily?: string;
}) {
  const theme = useTheme2();

  switch (item.type) {
    case 'pageNumber':
      return (
        <span style={getTextItemStyle(item, scaleFactor, footerFontFamily)}>
          <Trans i18nKey="reporting.report-footer.page-pagination">
            Page {{ currentPage }}/{{ totalPageCount }}
          </Trans>
        </span>
      );
    case 'date':
      return (
        <span style={getTextItemStyle(item, scaleFactor, footerFontFamily)}>
          {formatDate(item.value ?? DEFAULT_DATE_FORMAT)}
        </span>
      );
    case 'fixedText':
      return <span style={getTextItemStyle(item, scaleFactor, footerFontFamily)}>{item.value ?? ''}</span>;
    case 'logo':
      return (
        <img
          src={reportLogoUrl}
          alt={t('reporting.report-footer.logo-alt', 'Report logo')}
          style={{
            height: item.value ? `${item.value}px` : theme.spacing(3 * scaleFactor),
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      );
    case 'flexSpacer':
      return <div style={{ flex: 1 }} />;
    default:
      return null;
  }
}

function useReportLogoUrl() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const reportLogo = urlParams.get('reportLogo');

  return reportLogo ? getResourceUrl(reportLogo) : defaultReportLogo;
}

function getStyles(theme: GrafanaTheme2, scaleFactor: number) {
  return {
    footer: css({
      bottom: 0,
      minHeight: theme.spacing(4 * scaleFactor),
      height: 'auto',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1 * scaleFactor),
      padding: `0 ${theme.spacing(1 * scaleFactor)} ${theme.spacing(1 * scaleFactor)}`,
    }),
  };
}

function getLegacyStyles(theme: GrafanaTheme2, scaleFactor: number) {
  return {
    footer: css({
      bottom: 0,
      height: theme.spacing(4 * scaleFactor),
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      paddingBottom: theme.spacing(1 * scaleFactor),
    }),
    pageCount: css({
      flex: 1,
      textAlign: 'center',
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: `${0.85 * scaleFactor}rem`,
    }),
    logo: css({
      top: theme.spacing(0.5 * scaleFactor),
      right: theme.spacing(2 + 0.5 * scaleFactor),
    }),
    logoImg: css({
      maxWidth: theme.spacing(3 * scaleFactor),
      maxHeight: theme.spacing(3 * scaleFactor),
    }),
  };
}

export default ReportFooter;
