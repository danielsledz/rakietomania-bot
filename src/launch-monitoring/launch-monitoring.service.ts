import { Injectable } from '@nestjs/common';
import { Statuses } from 'src/api-data/data/statuses';
import { DiscordService } from 'src/discord/discord.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SanityService } from 'src/sanity/sanity.service';
import { Mission } from 'src/types';

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
  };

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
        tag: 'TEN_MINUTES' | 'ONE_HOUR' | 'TWENTY_FOUR_HOURS',
        timeUnit: string,
      ) => {
        for (const launch of launches) {
          if (!this.caches.sentNotifications.has(`${launch._id}_${tag}`)) {
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
            this.discordService.sendMessageAboutNotification(message);

            this.caches.sentNotifications.add(`${launch._id}_${tag}`);
          }
        }
      };

      const isValidStatus = (status: string) => {
        return (
          status !== 'ToBeConfirmed' &&
          status !== 'ToBeDetermined' &&
          status !== 'Hold'
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
        notifyLaunches(launchesStartingSoon, 'TEN_MINUTES', '10 minut'),
        notifyLaunches(launchesInOneHour, 'ONE_HOUR', 'godziny'),
        notifyLaunches(launchesIn24Hours, 'TWENTY_FOUR_HOURS', '24 godzin'),
      ]);
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error checking for potential notifications',
        error,
      );
    }
  }

  async checkAndUpdateLaunch(launch: any, matchingLaunchFromAPI: any) {
    const { _id, name, apiMissionID } = launch;
    const { net, probability, window_start, window_end, status } =
      matchingLaunchFromAPI;
    const configName = matchingLaunchFromAPI.rocket.configuration.name;

    const updateAndNotify = async (
      cacheKey: string,
      message: string,
      updateFields: object,
    ) => {
      if (!this.caches[cacheKey].has(_id)) {
        this.discordService.sendMessage(message, apiMissionID);
        await this.sanityService.updateSanityRecord(_id, updateFields);
        this.caches[cacheKey].add(_id);
      }
    };

    // Update launch date if it has changed and method is 'auto'
    if (
      launch.date !== net &&
      launch.dateUpdateMethod === 'auto' &&
      !launch.archived
    ) {
      await updateAndNotify(
        'changeDateLaunches',
        `Date changed for mission: ${name} | ${configName}`,
        { date: net },
      );
    }

    // Update probability if it has changed
    if (launch.probability !== probability) {
      await updateAndNotify(
        'changeProbabilityLaunches',
        `Probability changed for mission: ${name} | ${configName}`,
        { probability },
      );
    }

    // Update window start and end if they have changed
    if (
      launch.windowStart !== window_start ||
      launch.windowEnd !== window_end
    ) {
      await updateAndNotify(
        'changeWindowLaunches',
        `WindowStart and WindowEnd changed for mission: ${name} | ${configName}`,
        {
          windowStart: window_start,
          windowEnd: window_end,
        },
      );
    }

    // Update status if it has changed
    const externalAPIStatus = Statuses.find(
      (statusItem) => statusItem.externalAPIStatus === status.abbrev,
    );
    if (externalAPIStatus && launch.status !== externalAPIStatus.myAPIStatus) {
      await this.sanityService.updateSanityRecord(_id, {
        status: externalAPIStatus.myAPIStatus,
      });
    }
  }
}
