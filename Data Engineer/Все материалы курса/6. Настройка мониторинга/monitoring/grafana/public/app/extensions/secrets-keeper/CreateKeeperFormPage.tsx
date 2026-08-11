import { type JSX, useCallback, useMemo, useState } from 'react';

import { AppEvents, type NavModelItem } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents, locationService } from '@grafana/runtime';
import { Alert } from '@grafana/ui';
import { extractErrorMessage } from 'app/api/utils';
import { Page } from 'app/core/components/Page/Page';

import { AwsProviderFormContent } from './components/AwsProviderForm/AwsProviderFormContent';
import { KeeperForm } from './components/KeeperForm';
import { SECRETS_KEEPER_BASE_URL, SECRETS_KEEPER_NEW_URL } from './constants';
import { useCreateKeeper } from './hooks/useCreateKeeper';
import { type AwsKeeperFormValues, type KeeperFormValues } from './types';

const AWS_DEFAULT_VALUES: AwsKeeperFormValues = {
  name: '',
  description: '',
  type: 'aws',
  awsRegion: '',
  awsAssumeRoleArn: '',
  awsKmsKeyId: '',
  // Activation is a post-creation action; new keepers are never active.
  isActive: false,
};

interface CreateKeeperFormPageProps {
  defaultValues: KeeperFormValues;
  title: string;
  subtitle: string;
  children: (onCanSubmitChange: (canSubmit: boolean) => void) => React.ReactNode;
}

/**
 * Shared page wrapper for keeper creation. Handles navigation, error state,
 * and form submission. Provider-specific content is passed as a render function.
 */
const CreateKeeperFormPage = ({ defaultValues, title, subtitle, children }: CreateKeeperFormPageProps): JSX.Element => {
  const { createKeeper, isLoading } = useCreateKeeper();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [canSubmit, setCanSubmit] = useState(false);

  const pageNav: NavModelItem = useMemo(
    () => ({
      text: title,
      subTitle: subtitle,
      parentItem: {
        text: t('secrets-keeper.create.title', 'New keeper'),
        url: SECRETS_KEEPER_NEW_URL,
        parentItem: {
          text: t('secrets.page-title', 'Secrets'),
          url: SECRETS_KEEPER_BASE_URL,
        },
      },
    }),
    [title, subtitle]
  );

  const handleSubmit = useCallback(
    async (values: KeeperFormValues) => {
      setSubmitError(undefined);
      try {
        const keeper = await createKeeper(values);
        getAppEvents().publish({
          type: AppEvents.alertSuccess.name,
          payload: [
            t('secrets-keeper.create.success', 'Keeper "{{name}}" was created successfully', {
              name: keeper.metadata.name,
            }),
          ],
        });
        locationService.push(SECRETS_KEEPER_BASE_URL);
      } catch (err) {
        setSubmitError(extractErrorMessage(err));
      }
    },
    [createKeeper]
  );

  const handleCancel = useCallback(() => {
    locationService.push(SECRETS_KEEPER_NEW_URL);
  }, []);

  return (
    <Page navId="secrets-management" pageNav={pageNav}>
      <Page.Contents>
        {submitError && (
          <Alert severity="error" title={t('secrets-keeper.create.error.title', 'Failed to create keeper')}>
            {submitError}
          </Alert>
        )}
        <KeeperForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitText={t('secrets-keeper.create.btn-create', 'Create')}
          isSubmitting={isLoading}
          canSubmit={canSubmit}
        >
          {children(setCanSubmit)}
        </KeeperForm>
      </Page.Contents>
    </Page>
  );
};

// ── Per-provider page wrappers — add new providers here ──

export const CreateAwsKeeperPage = (): JSX.Element => (
  <CreateKeeperFormPage
    defaultValues={AWS_DEFAULT_VALUES}
    title={t('secrets-keeper.create.title-typed', 'Create Keeper with AWS Provider')}
    subtitle={t(
      'secrets-keeper.create.subtitle-typed',
      'Set up IAM access and configure your AWS Secrets Manager keeper'
    )}
  >
    {(onCanSubmitChange) => <AwsProviderFormContent onCanSubmitChange={onCanSubmitChange} />}
  </CreateKeeperFormPage>
);
