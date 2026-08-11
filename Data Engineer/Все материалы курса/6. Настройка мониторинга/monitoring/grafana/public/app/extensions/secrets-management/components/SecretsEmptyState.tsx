import { Trans, t } from '@grafana/i18n';
import { Button, EmptyState } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/extensions/types';

interface SecretsEmptyStateProps {
  onCreateSecret: () => void;
}

export function SecretsEmptyState({ onCreateSecret }: SecretsEmptyStateProps) {
  const canCreate = contextSrv.hasPermission(AccessControlAction.SecretSecureValuesCreate);
  return (
    <EmptyState
      variant="call-to-action"
      button={
        canCreate && (
          <Button onClick={onCreateSecret} icon="plus">
            <Trans i18nKey="secrets.actions.create-secret">Create secure value</Trans>
          </Button>
        )
      }
      message={t('secrets.empty-state.title', "You don't have any secrets yet.")}
    >
      <Trans i18nKey="secrets.empty-state.description">
        You can use secrets to store private information such as passwords, API keys and other sensitive data.
      </Trans>
      <br />
      {!canCreate && (
        <Trans i18nKey="secrets.empty-state.description-no-create">
          You do not have permission to create secure values. Please contact your administrator to create a new secure
          value.
        </Trans>
      )}
    </EmptyState>
  );
}
