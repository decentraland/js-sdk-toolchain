import { Alert, CircularProgress as Loader } from 'decentraland-ui2';

import { type GenericNotification } from '/@/modules/store/snackbar/types';

export function Generic({ severity, message }: GenericNotification) {
  const props = severity === 'loading' ? { icon: <Loader size={20} /> } : { severity };
  return <Alert {...props}>{message}</Alert>;
}
