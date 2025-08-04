import { useCallback } from 'react';
import type { ChainId } from '@dcl/schemas';

import { actions, type Deployment } from '/@/modules/store/deployment';
import {
  deriveOverallStatus as _deriveOverallStatus,
  checkDeploymentCompletion,
} from '/@/modules/store/deployment/utils';
import { useDispatch, useSelector } from '#store';

export const useDeploy = () => {
  const dispatch = useDispatch();
  const deployments = useSelector(state => state.deployment.deployments);

  const getDeployment = useCallback(
    (id: string): Deployment | undefined => deployments[id],
    [deployments],
  );

  const initializeDeployment = useCallback(
    async (path: string, port: number, chainId: ChainId, wallet: string) => {
      const payload = { path, port, chainId, wallet };
      dispatch(actions.initializeDeployment(payload));
    },
    [dispatch],
  );

  const executeDeployment = useCallback(
    async (path: string) => {
      dispatch(actions.executeDeployment(path));
    },
    [dispatch],
  );

  const removeDeployment = useCallback(
    (path: string) => {
      dispatch(actions.removeDeployment({ path }));
    },
    [dispatch],
  );

  const deriveOverallStatus = useCallback((deployment: Deployment) => {
    if (deployment.status === 'failed') {
      return 'failed';
    }
    return _deriveOverallStatus(deployment.componentsStatus);
  }, []);

  const isDeployFinishing = useCallback(
    (deployment: Deployment) => checkDeploymentCompletion(deployment.componentsStatus),
    [],
  );

  return {
    deployments,
    getDeployment,
    initializeDeployment,
    executeDeployment,
    deriveOverallStatus,
    isDeployFinishing,
    removeDeployment,
  };
};
