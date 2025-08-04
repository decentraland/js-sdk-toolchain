import type {
  CustomNotificationType,
  CustomNotification,
  GenericNotification,
  NotificationId,
  Severity,
  Opts,
} from './types';

let incrementalId = 0;

function getId(type: string): NotificationId {
  return `${type}_${++incrementalId}`;
}

export function createCustomNotification(
  notification: CustomNotificationType,
  opts?: Opts,
): CustomNotification {
  return { ...notification, ...opts, id: opts?.requestId || getId(notification.type) };
}

export function createGenericNotification(
  severity: Severity,
  message: string,
  opts?: Opts,
): GenericNotification {
  return { ...opts, id: opts?.requestId || getId('generic'), type: 'generic', severity, message };
}
