import { useCallback, useEffect } from 'react';
import { type ConnectedProps, connect } from 'react-redux';

import { t } from '@grafana/i18n';
import { Stack } from '@grafana/ui';
import { Permissions } from 'app/core/components/AccessControl/Permissions';
import { type ResourcePermission } from 'app/core/components/AccessControl/types';
import { UpgradeBox } from 'app/core/components/Upgrade/UpgradeBox';
import { contextSrv } from 'app/core/services/context_srv';
import { highlightTrial } from 'app/features/admin/utils';
import { loadDataSource, loadDataSourceMeta } from 'app/features/datasources/state/actions';
import { useDataSourceRights } from 'app/features/datasources/state/hooks';

import { TeamLBACEditor } from '../teamLBAC/TeamLBACEditor';
import { selectTeamLBACRules } from '../teamLBAC/state/selectors';
import { addTeamLBACWarnings, getLBACTeamsConfigured, hasLBACSupport } from '../teamLBAC/utils';
import { AccessControlAction as EnterpriseActions, type EnterpriseStoreState } from '../types';

type ExternalProps = { uid: string };

function mapStateToProps(state: EnterpriseStoreState, props: ExternalProps) {
  const { uid } = props;
  return {
    resourceId: uid,
    dataSourceConfig: state.dataSources.dataSource,
    teamLBACRules: selectTeamLBACRules(state),
  };
}

const mapDispatchToProps = {
  loadDataSource,
  loadDataSourceMeta,
};

const connector = connect(mapStateToProps, mapDispatchToProps);
type Props = ConnectedProps<typeof connector>;

// The RBAC version for data source permissions
const DataSourcePermissions = ({
  resourceId,
  dataSourceConfig,
  teamLBACRules,
  loadDataSource,
  loadDataSourceMeta,
}: Props) => {
  useEffect(() => {
    // Initialize DS metadata on page load to populate tab navigation
    loadDataSource(resourceId).then(loadDataSourceMeta);
  }, [loadDataSource, loadDataSourceMeta, resourceId]);

  const canSetPermissions = contextSrv.hasPermissionInMetadata(
    EnterpriseActions.DataSourcesPermissionsWrite,
    dataSourceConfig
  );

  const onTeamLBACUpdate = () => {
    loadDataSource(resourceId);
  };

  const { readOnly, hasWriteRights } = useDataSourceRights(dataSourceConfig.uid);
  const showTeamLBAC = hasLBACSupport(dataSourceConfig);
  const readOnlyLBAC = readOnly || !canSetPermissions || !hasWriteRights;

  const getLBACWarnings = useCallback(
    (items: ResourcePermission[]) => {
      if (!showTeamLBAC || !teamLBACRules.length) {
        return items;
      }
      const lbacTeamsConfigured = getLBACTeamsConfigured(teamLBACRules);
      return addTeamLBACWarnings(lbacTeamsConfigured, items);
    },
    [showTeamLBAC, teamLBACRules]
  );

  return (
    <Stack direction={'column'} gap={2}>
      {highlightTrial() && (
        <UpgradeBox
          featureId={'data-source-permissions'}
          eventVariant={'trial'}
          featureName={'data source permissions'}
          text={t(
            'permissions.data-source-permissions.text-enable-source-permissions-during-trial-grafana',
            'Enable data source permissions for free during your trial of Grafana Pro.'
          )}
        />
      )}
      <Permissions
        resource="datasources"
        resourceId={resourceId}
        canSetPermissions={canSetPermissions}
        queryParams={{ ds_type: dataSourceConfig.type }}
        getWarnings={showTeamLBAC ? getLBACWarnings : undefined}
        epilogue={
          showTeamLBAC
            ? (items) => (
                <TeamLBACEditor
                  dataSourceConfig={dataSourceConfig}
                  readOnly={readOnlyLBAC}
                  onTeamLBACUpdate={onTeamLBACUpdate}
                  items={items}
                />
              )
            : undefined
        }
      />
    </Stack>
  );
};

export default connector(DataSourcePermissions);
