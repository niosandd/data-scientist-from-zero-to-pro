import { css } from '@emotion/css';

import { t } from '@grafana/i18n';
import { ConfirmModal, useStyles2 } from '@grafana/ui';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

// Discard-changes confirmation modal for the saved queries modal experience.
// Rendered locally (rather than via the global ShowConfirmModalEvent bus) so we
// can center it vertically over the parent modal instead of aligning to top: 10%.
export function SavedQueriesCloseGuard({ isOpen, onConfirm, onDismiss }: Props) {
  const styles = useStyles2(getStyles);

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={t('saved-queries.close-guard.title', 'Discard changes to query?')}
      body={t(
        'saved-queries.close-guard.body',
        'You have unsaved changes to this query. Are you sure you want to discard them?'
      )}
      confirmText={t('saved-queries.close-guard.confirm-button', 'Discard')}
      modalClass={styles.centeredModal}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    />
  );
}

const getStyles = () => ({
  centeredModal: css({
    top: '50%',
    transform: 'translateY(-50%)',
  }),
});
