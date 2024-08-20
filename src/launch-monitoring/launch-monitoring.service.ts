import { Injectable } from '@nestjs/common';
import { Statuses } from 'src/api-data/data/statuses';
import { DiscordService } from 'src/discord/discord.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SanityService } from 'src/sanity/sanity.service';
import { Mission } from 'src/types';
import { Launch } from 'src/types/launchFromSpaceLaunchNow';
import {
  NotificationTime,
  NotificationTimeType,
} from './config/notificationTimeConfig';
import { MissionStatus } from 'src/types/missionStatus';

@Injectable()
export class LaunchMonitoringService {
  constructor(
    private readonly discordService: DiscordService,
    private sanityService: SanityService,
    private notificationService: NotificationsService,
    private errorHandlingService: ErrorHandlingService,
  ) {}

  caches = {
    archivedLaunches: new Set<string>(),
    changeDateLaunches: new Set<string>(),
    changeWindowLaunches: new Set<string>(),
    changeProbabilityLaunches: new Set<string>(),
    sentNotifications: new Set<string>(),
    updatedStatusLaunches: new Set<string>(),
  };

  private lockedNotifications: Set<string> = new Set();

  private lockNotification(notificationKey: string): boolean {
    if (this.lockedNotifications.has(notificationKey)) {
      return false;
    }
    this.lockedNotifications.add(notificationKey);
    return true;
  }

  private unlockNotification(notificationKey: string): void {
    this.lockedNotifications.delete(notificationKey);
  }

  async checkForUpcomingLaunches() {
    try {
      if (
        !this.sanityService.sanityDataCache ||
        this.sanityService.sanityDataCache.length === 0
      ) {
        console.log('Sanity data cache is empty or not fetched yet.');
        return;
      }
      const currentTime = new Date();
      const notifyLaunches = async (
        launches: Mission[],
        tag: NotificationTimeType,
        timeUnit: string,
      ) => {
        for (const launch of launches) {
          const notificationKey = `${launch._id}_${tag}`;
          if (!this.caches.sentNotifications.has(notificationKey)) {
            // Zastosowanie blokady dla danego launch ID
            if (!this.lockNotification(notificationKey)) {
              console.log(
                `Another process is already sending notification for ${notificationKey}`,
              );
              continue;
            }

            console.log(`Sending notification for ${notificationKey}`);
            const rocketName = await this.sanityService.fetch(
              `*[_type == "mission" && _id == "${launch._id}"]{..., rocket->{name, "imageUrl": image.asset->url}}`,
            );
            const message = `Start rakiety ${rocketName[0].rocket.name}!`;
            await this.notificationService.sendLaunchNotification({
              message: message,
              body: `W ciągu ${timeUnit} rozpocznie się start misji ${launch.name}!`,
              tag: tag,
              image: rocketName[0].rocket.imageUrl,
              launchId: launch._id,
            });

            console.log(
              message,
              `W ciągu ${timeUnit} rozpocznie się start misji ${launch.name}!`,
              tag,
              rocketName[0].rocket.imageUrl, // image
              launch.name, // launchName
              launch.livestream,
            );

            await this.discordService.sendMessageAboutNotification(
              message,
              `W ciągu ${timeUnit} rozpocznie się start misji ${launch.name}!`,
              tag,
              rocketName[0].rocket.imageUrl, // image
              launch._id, // launch
              launch.name, // launchName
              launch.livestream,
            );
            this.caches.sentNotifications.add(notificationKey);
            this.unlockNotification(notificationKey);
          } else {
            console.log(`Notification for ${notificationKey} already sent.`);
          }
        }
      };

      const isValidStatus = (status: MissionStatus) => {
        return (
          status !== MissionStatus.ToBeConfirmed &&
          status !== MissionStatus.ToBeDetermined &&
          status !== MissionStatus.Hold
        );
      };

      const launchesStartingSoon = this.sanityService.sanityDataCache.filter(
        (launch) => {
          const launchTime = new Date(launch.date);
          const timeDifference = launchTime.getTime() - currentTime.getTime();
          return (
            isValidStatus(launch.status) &&
            timeDifference >= 9.5 * 60000 &&
            timeDifference <= 10 * 60000
          );
        },
      );

      const launchesInOneHour = this.sanityService.sanityDataCache.filter(
        (launch) => {
          const launchTime = new Date(launch.date);
          const timeDifference = launchTime.getTime() - currentTime.getTime();
          return (
            isValidStatus(launch.status) &&
            timeDifference >= 60 * 60000 - 10000 &&
            timeDifference <= 60 * 60000
          );
        },
      );

      const launchesIn24Hours = this.sanityService.sanityDataCache.filter(
        (launch) => {
          const launchTime = new Date(launch.date);
          const timeDifference = launchTime.getTime() - currentTime.getTime();
          return (
            isValidStatus(launch.status) &&
            timeDifference >= 24 * 60 * 60 * 1000 - 10000 &&
            timeDifference <= 24 * 60 * 60 * 1000
          );
        },
      );

      await Promise.all([
        notifyLaunches(
          launchesStartingSoon,
          NotificationTime.TEN_MINUTES,
          '10 minut',
        ),
        notifyLaunches(launchesInOneHour, NotificationTime.ONE_HOUR, 'godziny'),
        notifyLaunches(
          launchesIn24Hours,
          NotificationTime.TWENTY_FOUR_HOURS,
          '24 godzin',
        ),
      ]);
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error checking for potential notifications',
        error,
      );
    }
  }

  async updateAndNotify(
    cacheKey: string,
    fieldName: string,
    missionName: string,
    rocketName: string,
    oldValue: string | number,
    newValue: string | number,
    updateFields: object,
    _id: string,
  ) {
    if (this.caches[cacheKey].has(_id)) {
      return;
    }

    // Zbudowanie szczegółowej wiadomości
    const messageTitle = `Zmieniono ${fieldName}`;
    const messageBody =
      `Pole: **${fieldName}**\n` +
      `Misja: **${missionName}**\n` +
      `Rakieta: **${rocketName}**\n` +
      `Wartość przed: **${oldValue}**\n` +
      `Wartość po: **${newValue}**\n` +
      `ID Misji: **${_id}**`;

    // Aktualizacja rekordu w Sanity
    await this.sanityService.updateSanityRecord(_id, updateFields);

    // Wysłanie wiadomości na Discord
    await this.discordService.sendMessage(messageTitle, messageBody);

    // Aktualizacja cache po udanej operacji
    this.caches[cacheKey].add(_id);
  }

  async checkAndUpdateLaunch(launch: Mission, matchingLaunchFromAPI: Launch) {
    const { _id, name } = launch;
    const { net, probability, window_start, window_end, status } =
      matchingLaunchFromAPI;
    const configName = matchingLaunchFromAPI.rocket.configuration.name;

    // Funkcja do formatowania daty
    const formatDateToPolishTimezone = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
    };

    if (
      launch.date !== net &&
      launch.dateUpdateMethod === 'auto' &&
      !launch.archived
    ) {
      const oldDateFormatted = formatDateToPolishTimezone(launch.date);
      const newDateFormatted = formatDateToPolishTimezone(net);
      await this.updateAndNotify(
        'changeDateLaunches',
        'data startu',
        name,
        configName,
        oldDateFormatted,
        newDateFormatted,
        { date: net },
        _id,
      );
    }

    if (launch.probability !== probability) {
      const oldProbability =
        launch.probability !== null ? `${launch.probability}%` : 'null';
      const newProbability = probability !== null ? `${probability}%` : 'null';

      await this.updateAndNotify(
        'changeProbabilityLaunches',
        'prawdopodobieństwo startu',
        name,
        configName,
        oldProbability,
        newProbability,
        { probability },
        _id,
      );
    }

    if (
      launch.windowStart !== window_start ||
      launch.windowEnd !== window_end
    ) {
      const oldWindowStartFormatted = formatDateToPolishTimezone(
        launch.windowStart,
      );
      const oldWindowEndFormatted = formatDateToPolishTimezone(
        launch.windowEnd,
      );
      const newWindowStartFormatted = formatDateToPolishTimezone(window_start);
      const newWindowEndFormatted = formatDateToPolishTimezone(window_end);

      await this.updateAndNotify(
        'changeWindowLaunches',
        'okno czasowe startu',
        name,
        configName,
        `${oldWindowStartFormatted} - ${oldWindowEndFormatted}`,
        `${newWindowStartFormatted} - ${newWindowEndFormatted}`,
        {
          windowStart: window_start,
          windowEnd: window_end,
        },
        _id,
      );
    }

    const externalAPIStatus = Statuses.find(
      (statusItem) => statusItem.externalAPIStatus === status.abbrev,
    );

    if (externalAPIStatus && launch.status !== externalAPIStatus.myAPIStatus) {
      const previousStatus = launch.status;
      await this.sanityService.updateSanityRecord(_id, {
        status: externalAPIStatus.myAPIStatus,
      });
      this.discordService.sendMessage(
        `Zmieniono status`,
        `Pole: **status**\nMisja: **${name}**\nRakieta: **${configName}**\nWartość przed: **${previousStatus}**\nWartość po: **${externalAPIStatus.myAPIStatus}**\nID Misji: **${_id}**`,
      );
      this.caches.updatedStatusLaunches.add(_id);
    }
  }
}
