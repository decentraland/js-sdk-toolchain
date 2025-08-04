import type { AlertColor } from 'decentraland-ui2';
import type { Project } from '/shared/types/projects';

export type Severity = AlertColor | 'loading';
export type NotificationId = string;
export type CustomNotificationType =
  | { type: 'missing-scenes' }
  | { type: 'new-dependency-version'; project: Project }
  | { type: 'deploy'; path: string };

export type Opts = {
  requestId?: string;
  duration?: number;
};

type CommonNotificationProps<T extends { type: string }> = {
  id: NotificationId;
} & T &
  Opts;

export type CustomNotification = CommonNotificationProps<CustomNotificationType>;
export type GenericNotification = CommonNotificationProps<{ type: 'generic' }> & {
  severity: Severity;
  message: string;
};

export type Notification = CustomNotification | GenericNotification;
