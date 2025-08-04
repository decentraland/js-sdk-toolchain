import { useCallback, type SyntheticEvent } from 'react';
import { type SnackbarCloseReason } from 'decentraland-ui2';

import { actions } from '/@/modules/store/snackbar';
import {
  createCustomNotification,
  createGenericNotification,
} from '/@/modules/store/snackbar/utils';
import type { Notification } from '/@/modules/store/snackbar/types';
import { useDispatch, useSelector } from '#store';

export function useSnackbar() {
  const dispatch = useDispatch();
  const snackbar = useSelector(state => state.snackbar);

  const dismiss = useCallback(
    (id: Notification['id'], idx: number) =>
      (_: SyntheticEvent<any> | Event, reason: SnackbarCloseReason) => {
        if (reason === 'timeout') dispatch(actions.removeSnackbar(id));
        if (reason === 'escapeKeyDown' && idx === 0) {
          const first = snackbar.notifications[0];
          dispatch(actions.removeSnackbar(first.id));
        }
      },
    [snackbar.notifications],
  );

  const close = useCallback(
    (id: Notification['id']) => () => {
      dispatch(actions.removeSnackbar(id));
    },
    [],
  );

  const push = useCallback(
    (notification: Notification) => {
      dispatch(actions.pushSnackbar(notification));
    },
    [dispatch, actions.pushSnackbar],
  );

  const pushGeneric = useCallback(
    (...params: Parameters<typeof createGenericNotification>) => {
      dispatch(actions.pushSnackbar(createGenericNotification(...params)));
    },
    [dispatch, actions.pushSnackbar],
  );

  const pushCustom = useCallback(
    (...params: Parameters<typeof createCustomNotification>) => {
      dispatch(actions.pushSnackbar(createCustomNotification(...params)));
    },
    [dispatch, actions.pushSnackbar],
  );

  return {
    ...snackbar,
    close,
    dismiss,
    push,
    pushGeneric,
    pushCustom,
  };
}
