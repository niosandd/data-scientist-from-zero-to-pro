import { t } from '@grafana/i18n';
import { type SceneComponentProps, SceneObjectBase } from '@grafana/scenes';
import { shareDashboardType } from 'app/features/dashboard/components/ShareModal/utils';
import { type SceneShareTabState, type ShareView } from 'app/features/dashboard-scene/sharing/types';
import { getDashboardSceneFor } from 'app/features/dashboard-scene/utils/utils';

import { CreateReportTab as CreateReportTabBase } from '../../reports/CreateReportTab';

export class CreateReportTab extends SceneObjectBase<SceneShareTabState> implements ShareView {
  public tabId = shareDashboardType.report;
  static Component = CreateReportTabRenderer;

  public getTabLabel() {
    return t('share-dashboard.menu.schedule-report-title', 'Schedule report');
  }
}

function CreateReportTabRenderer({ model }: SceneComponentProps<CreateReportTab>) {
  const { modalRef } = model.useState();
  const dashboard = getDashboardSceneFor(model);

  return (
    <CreateReportTabBase
      dashboard={dashboard}
      onDismiss={() => {
        modalRef?.resolve()?.onDismiss();
      }}
    />
  );
}
