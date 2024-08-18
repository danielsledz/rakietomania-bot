import {
  NotificationTimeDevelopment,
  NotificationTimeProduction,
} from '../enum/notificationTime.enum';

const environment = process.env.NODE_ENV || 'development';

export const NotificationTime = {
  TEN_MINUTES:
    environment === 'production'
      ? NotificationTimeProduction.TEN_MINUTES
      : NotificationTimeDevelopment.TEN_MINUTES_DEV,
  ONE_HOUR:
    environment === 'production'
      ? NotificationTimeProduction.ONE_HOUR
      : NotificationTimeDevelopment.ONE_HOUR_DEV,
  TWENTY_FOUR_HOURS:
    environment === 'production'
      ? NotificationTimeProduction.TWENTY_FOUR_HOURS
      : NotificationTimeDevelopment.TWENTY_FOUR_HOURS_DEV,
} as const;

export type NotificationTimeType =
  (typeof NotificationTime)[keyof typeof NotificationTime];
