import { css } from '@emotion/css';
import { useCallback, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2, IconButton, Text, Tooltip } from '@grafana/ui';

import { type DomainInfo } from '../../../types';

const getStyles = (theme: GrafanaTheme2) => ({
  settingsGrid: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
  }),
  infoCard: css({
    padding: theme.spacing(2),
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    background: theme.colors.background.secondary,
  }),
  infoLabel: css({
    marginBottom: theme.spacing(0.5),
  }),
  infoValue: css({
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
});

interface Props {
  domainInfo: DomainInfo;
  stackId: string;
}

const CopyButton = ({ textToCopy, ariaLabel }: { textToCopy: string; ariaLabel: string }) => {
  const [copied, setCopied] = useState(false);

  const onClipboardCopy = useCallback(() => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [textToCopy]);

  return (
    <Tooltip content={copied ? t('scim.config.copied', 'Copied!') : ariaLabel} placement="top">
      <IconButton
        name={copied ? 'check' : 'copy'}
        aria-label={ariaLabel}
        onClick={onClipboardCopy}
        variant="secondary"
        size="sm"
      />
    </Tooltip>
  );
};

export const SCIMInfoCards = ({ domainInfo, stackId }: Props) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.infoCard}>
        <div className={styles.infoLabel}>
          <Text variant="bodySmall" color="secondary">
            {t('scim.config.domain', 'Domain')}
          </Text>
        </div>
        <div className={styles.infoValue}>
          <Text variant="code">{domainInfo.domain}</Text>
          <CopyButton
            textToCopy={domainInfo.domain}
            ariaLabel={t('scim.config.copy-domain', 'Copy domain to clipboard')}
          />
        </div>
      </div>
      <div className={styles.infoCard}>
        <div className={styles.infoLabel}>
          <Text variant="bodySmall" color="secondary">
            {t('scim.config.stackId', 'Stack ID')}
          </Text>
        </div>
        <div className={styles.infoValue}>
          <Text variant="code">{stackId}</Text>
          <CopyButton textToCopy={stackId} ariaLabel={t('scim.config.copy-stack-id', 'Copy stack ID to clipboard')} />
        </div>
      </div>
    </div>
  );
};
