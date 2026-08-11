import { type JSX, useMemo } from 'react';

import { type NavModelItem } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Page } from 'app/core/components/Page/Page';

import { KeeperTypeChooser } from './components/KeeperTypeChooser';
import { SECRETS_KEEPER_BASE_URL } from './constants';

export const ChooseKeeperTypePage = (): JSX.Element => {
  const pageNav: NavModelItem = useMemo(
    () => ({
      text: t('secrets-keeper.create.title', 'New keeper'),
      subTitle: t('secrets-keeper.create.subtitle', 'Choose a keeper type to store and manage your secrets.'),
      parentItem: {
        text: t('secrets.page-title', 'Secrets'),
        url: SECRETS_KEEPER_BASE_URL,
      },
    }),
    []
  );

  return (
    <Page navId="secrets-management" pageNav={pageNav}>
      <Page.Contents>
        <KeeperTypeChooser />
      </Page.Contents>
    </Page>
  );
};

export default ChooseKeeperTypePage;
