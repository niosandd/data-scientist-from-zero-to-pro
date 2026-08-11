import { type JSX, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom-v5-compat';

import { AppEvents, type NavModelItem } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getAppEvents, locationService } from '@grafana/runtime';
import { Alert, Badge, Button, LinkButton, Stack, useStyles2 } from '@grafana/ui';
import { extractErrorMessage } from 'app/api/utils';
import { Page } from 'app/core/components/Page/Page';

import { AwsProviderEditContent } from './components/AwsProviderForm/AwsProviderEditContent';
import { AwsProviderSection1 } from './components/AwsProviderForm/AwsProviderSection1';
import { AwsProviderSection2 } from './components/AwsProviderForm/AwsProviderSection2';
import { AwsProviderSection3 } from './components/AwsProviderForm/AwsProviderSection3';
import { getInstructionStyles } from './components/AwsProviderForm/awsProviderInstructionStyles';
import { KeeperForm } from './components/KeeperForm';
import { SECRETS_KEEPER_BASE_URL, SYSTEM_KEEPER_NAME } from './constants';
import { useActivateKeeper } from './hooks/useActivateKeeper';
import { useKeeper } from './hooks/useKeeper';
import { useReplaceKeeper } from './hooks/useReplaceKeeper';
import { type KeeperFormValues } from './types';
import { keeperToFormValues } from './utils';

const EditKeeperFormPage = (): JSX.Element => {
  // React hooks
  const { name = '' } = useParams<{ name: string }>();
  const styles = useStyles2(getInstructionStyles);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [canSubmit, setCanSubmit] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({ 1: false, 2: false, 3: false });

  // Custom hooks
  const { keeper, isLoading: isFetching, error: fetchError } = useKeeper(name);
  const { replaceKeeper, isLoading: isReplacing } = useReplaceKeeper();
  const { activateKeeper, isLoading: isActivating } = useActivateKeeper();
  // Active state comes from the keeper's own status — the activate mutation
  // invalidates the Keeper tag so getKeeper refetches automatically. Reading
  // here (rather than from useKeepers) keeps a single fetch dependency for
  // the page and avoids a race where the form mounts before the list query
  // resolves.
  const isActive = Boolean(keeper?.status.active);
  const isSubmitting = isReplacing || isActivating;

  const pageNav: NavModelItem = useMemo(
    () => ({
      text: name,
      subTitle: t('secrets-keeper.edit.subtitle', 'Edit keeper configuration'),
      parentItem: {
        text: t('secrets.page-title', 'Secrets'),
        url: SECRETS_KEEPER_BASE_URL,
      },
    }),
    [name]
  );

  const handleSubmit = useCallback(
    async (values: KeeperFormValues) => {
      setSubmitError(undefined);
      if (!keeper) {
        setSubmitError(
          t('secrets-keeper.edit.error.no-keeper', 'Keeper data is not available. Please reload the page.')
        );
        return;
      }
      try {
        await replaceKeeper(values, name, keeper.metadata.resourceVersion ?? '');
        // Apply activation change if the toggle diverged from the current
        // active keeper. Activate the keeper itself when turning on, or
        // activate the system keeper to deactivate.
        if (values.isActive !== isActive) {
          await activateKeeper(values.isActive ? name : SYSTEM_KEEPER_NAME);
        }
        getAppEvents().publish({
          type: AppEvents.alertSuccess.name,
          payload: [
            // Use `name` from useParams — guaranteed non-empty by the early
            // return on `!keeper`. The replaceKeeper response types
            // metadata.name as `string | undefined`, which would render
            // "Keeper "undefined" was updated successfully" on a partial
            // response.
            t('secrets-keeper.edit.success', 'Keeper "{{name}}" was updated successfully', { name }),
          ],
        });
        locationService.push(SECRETS_KEEPER_BASE_URL);
      } catch (err) {
        setSubmitError(extractErrorMessage(err));
      }
    },
    [activateKeeper, isActive, keeper, name, replaceKeeper]
  );

  const handleCancel = useCallback(() => {
    locationService.push(SECRETS_KEEPER_BASE_URL);
  }, []);

  const toggleSection = (n: 1 | 2 | 3) => setSectionOpen((prev) => ({ ...prev, [n]: !prev[n] }));
  const advanceSection = (current: 1 | 2) => {
    const next = (current + 1) as 2 | 3;
    setSectionOpen((prev) => ({ ...prev, [current]: false, [next]: true }));
  };

  // Render the badge only when the keeper has loaded; Page.Contents covers the
  // pre-load state with a spinner, so there's no flash of wrong state.
  const showStatusRow = Boolean(keeper);

  if (fetchError) {
    return (
      <Page navId="secrets-management" pageNav={pageNav}>
        <Page.Contents>
          <Alert
            severity="error"
            title={t('secrets-keeper.edit.error.fetch-title', 'Failed to load keeper')}
            data-testid="edit-fetch-error"
          >
            {extractErrorMessage(fetchError)}
          </Alert>
          <LinkButton href={SECRETS_KEEPER_BASE_URL} variant="secondary" data-testid="back-to-keepers">
            {t('secrets-keeper.edit.back-to-keepers', 'Back to keepers')}
          </LinkButton>
        </Page.Contents>
      </Page>
    );
  }

  const defaultValues = keeper ? keeperToFormValues(keeper) : undefined;
  const isUnsupportedType = keeper && !defaultValues;

  // The aria-live region must exist in the DOM before its content appears so
  // the announcement fires on first render. Wrapping a conditional inside the
  // always-mounted region keeps the live-region semantics intact while the
  // keeper data is still loading.
  const statusRow = (
    <div aria-live="polite" aria-atomic="true">
      {showStatusRow && (
        <Stack direction="row" gap={1} alignItems="center">
          {isActive ? (
            <Badge
              text={t('secrets-keeper.edit.active-badge', 'Active')}
              color="green"
              icon="check"
              data-testid="edit-active-badge"
            />
          ) : (
            <Badge
              text={t('secrets-keeper.edit.inactive-badge', 'Inactive')}
              color="darkgrey"
              data-testid="edit-inactive-badge"
            />
          )}
        </Stack>
      )}
    </div>
  );

  const unsupportedTypeAlert = (
    <Alert
      severity="warning"
      title={t('secrets-keeper.edit.error.unsupported-title', 'Unsupported keeper type')}
      data-testid="edit-unsupported-type"
    >
      {t(
        'secrets-keeper.edit.error.unsupported-body',
        'This keeper type cannot be edited in the UI. Only AWS keepers are currently supported.'
      )}
    </Alert>
  );

  const submitErrorAlert = (
    <Alert
      severity="error"
      title={t('secrets-keeper.edit.error.submit-title', 'Failed to update keeper')}
      data-testid="edit-submit-error"
    >
      {submitError}
    </Alert>
  );

  const instructionSections = (
    <Stack direction="column" gap={2} data-testid="edit-keeper-instructions">
      <div className={styles.drawerBox}>
        <AwsProviderSection1
          isOpen={sectionOpen[1]}
          onToggle={() => toggleSection(1)}
          onContinue={() => advanceSection(1)}
        />
      </div>
      <div className={styles.drawerBox}>
        <AwsProviderSection2
          isOpen={sectionOpen[2]}
          onToggle={() => toggleSection(2)}
          onContinue={() => advanceSection(2)}
        />
      </div>
      <div className={styles.drawerBox}>
        <AwsProviderSection3
          isOpen={sectionOpen[3]}
          onToggle={() => toggleSection(3)}
          onContinue={() => toggleSection(3)}
        />
      </div>
    </Stack>
  );

  return (
    <Page navId="secrets-management" pageNav={pageNav}>
      <Page.Contents isLoading={isFetching}>
        {isUnsupportedType && unsupportedTypeAlert}
        {submitError && submitErrorAlert}
        {statusRow}
        {defaultValues && (
          <>
            <KeeperForm
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitText={t('secrets-keeper.edit.btn-save', 'Save')}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
            >
              <AwsProviderEditContent onCanSubmitChange={setCanSubmit} />
            </KeeperForm>

            <Button
              variant="secondary"
              fill="text"
              icon={showInstructions ? 'angle-up' : 'angle-down'}
              onClick={() => setShowInstructions((prev) => !prev)}
              data-testid="toggle-instructions"
            >
              {showInstructions
                ? t('secrets-keeper.edit.hide-instructions', 'Hide setup instructions')
                : t('secrets-keeper.edit.show-instructions', 'Show setup instructions')}
            </Button>

            {showInstructions && instructionSections}
          </>
        )}
      </Page.Contents>
    </Page>
  );
};

export const EditAwsKeeperPage = EditKeeperFormPage;
