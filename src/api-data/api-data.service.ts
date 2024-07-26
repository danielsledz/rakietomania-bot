import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mission } from 'src/types';
import { DiscordService } from 'src/discord/discord.service';
import { Statuses } from './data/statuses';
import { SanityService } from 'src/sanity/sanity.service';
import axios from 'axios';
import { LaunchCollection } from 'src/types/launchFromSpaceLaunchNow';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ApiDataService {
  private sanityDataCache: Mission[] | null = null;
  private sanityDataLastFetched: Date = new Date(0);
  private launchApiDataCache: LaunchCollection | null = null;
  private launchApiDataLastFetched: Date = new Date(0);
  private caches = {
    archivedLaunches: new Set<string>(),
    changeDateLaunches: new Set<string>(),
    changeWindowLaunches: new Set<string>(),
    changeProbabilityLaunches: new Set<string>(),
    sentNotifications: new Set<string>(),
  };

  constructor(
    private readonly discordService: DiscordService,
    private sanityService: SanityService,
    private configService: ConfigService,
    private notificationService: NotificationsService,
  ) {
    this.fetchSanityData();
    this.fetchLaunchApiData();
  }

  private async fetchSanityData(): Promise<Mission[]> {
    const now = new Date();
    if (
      !this.sanityDataCache ||
      now.getTime() - this.sanityDataLastFetched.getTime() > 180000
    ) {
      this.sanityDataCache = await this.sanityService.fetch(
        '*[_type == "mission"]',
      );
      this.sanityDataLastFetched = now;
    }
    return this.sanityDataCache;
  }

  private async fetchLaunchApiData(): Promise<LaunchCollection> {
    const now = new Date();
    if (
      !this.launchApiDataCache ||
      now.getTime() - this.launchApiDataLastFetched.getTime() > 180000
    ) {
      try {
        const response = await axios.get(
          this.configService.get<string>('LAUNCH_API_URL'),
        );
        this.launchApiDataCache = response.data;
        this.launchApiDataLastFetched = now;
      } catch (error) {
        console.error(error);
        throw new Error('Error fetching launch data: ' + error.message);
      }
    }
    return this.launchApiDataCache;
  }

  private async updateSanityRecord(
    id: string,
    updateFields: object,
  ): Promise<void> {
    try {
      await this.sanityService
        .sanityClient(false)
        .patch(id)
        .set(updateFields)
        .commit();
    } catch (err) {
      console.error('Operation failed', err.message);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deleteOldLaunches() {
    const dataFromSanity = await this.fetchSanityData();
    const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const outdatedLaunches = dataFromSanity.filter(
      (launch) =>
        new Date(launch.date) < date24HoursAgo &&
        !launch.archived &&
        launch.environment === 'production',
    );

    for (const launch of outdatedLaunches) {
      if (!this.caches.archivedLaunches.has(launch._id)) {
        this.discordService.sendMessage(
          'Archived mission: ' + launch.name,
          launch.apiMissionID,
        );
        await this.updateSanityRecord(launch._id, { archived: true });
        this.caches.archivedLaunches.add(launch._id);
      }
    }

    return dataFromSanity;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronAndCheckStatus() {
    const dataFromSanity = await this.fetchSanityData();
    const dataFromLaunchAPI = await this.getLaunchData();

    for (const launch of dataFromSanity.filter((launch) => !launch.archived)) {
      const matchingLaunchFromAPI = dataFromLaunchAPI.results.find(
        (launchFromAPI) => launchFromAPI.id === launch.apiMissionID,
      );

      if (!matchingLaunchFromAPI) {
        // console.log(launch.name, 'does not exist in the database');
        continue;
      }

      await this.checkAndUpdateLaunch(launch, matchingLaunchFromAPI);
    }

    return dataFromSanity;
  }

  private async checkAndUpdateLaunch(launch: any, matchingLaunchFromAPI: any) {
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
        await this.updateSanityRecord(_id, updateFields);
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
    if (probability !== null && launch.probability !== probability) {
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
      await this.updateSanityRecord(_id, {
        status: externalAPIStatus.myAPIStatus,
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async fetchLaunchData() {
    await this.fetchSanityData();
    await this.fetchLaunchApiData();
    console.log('Fetched new data from APIs');
  }

  private async getLaunchData(): Promise<LaunchCollection> {
    const now = new Date();
    if (
      !this.launchApiDataCache ||
      now.getTime() - this.launchApiDataLastFetched.getTime() > 600000
    ) {
      await this.fetchLaunchData();
    }
    return this.launchApiDataCache;
  }
  async checkForUpcomingLaunches() {
    if (
      !this.sanityDataLastFetched ||
      !this.sanityDataCache ||
      this.sanityDataCache.length === 0
    ) {
      console.log('Sanity data cache is empty or not fetched yet.');
      return;
    }

    const currentTime = new Date();
    console.log(`Current Time: ${currentTime.toISOString()}`);

    const launchesStartingSoon = this.sanityDataCache.filter((launch) => {
      const launchTime = new Date(launch.date);
      const timeDifference = launchTime.getTime() - currentTime.getTime();
      return timeDifference >= 9.5 * 60000 && timeDifference <= 10 * 60000;
    });

    const launchesInOneHour = this.sanityDataCache.filter((launch) => {
      const launchTime = new Date(launch.date);
      const timeDifference = launchTime.getTime() - currentTime.getTime();
      return (
        timeDifference >= 60 * 60000 - 10000 && timeDifference <= 60 * 60000
      );
    });

    const launchesIn24Hours = this.sanityDataCache.filter((launch) => {
      const launchTime = new Date(launch.date);
      const timeDifference = launchTime.getTime() - currentTime.getTime();
      return (
        timeDifference >= 24 * 60 * 60 * 1000 - 10000 &&
        timeDifference <= 24 * 60 * 60 * 1000
      );
    });

    console.log(`Launches starting soon: ${launchesStartingSoon.length}`);
    console.log(`Launches in one hour: ${launchesInOneHour.length}`);
    console.log(`Launches in 24 hours: ${launchesIn24Hours.length}`);

    for (const launch of launchesStartingSoon) {
      if (!this.caches.sentNotifications.has(`${launch._id}_10_MINUTES`)) {
        const message = `10 minut do startu rakiety ${launch.rocket.name} z misją ${launch.name}!`;
        console.log(message);
        await this.notificationService.sendLaunchNotification({
          message: message,
          body: launch.description,
          tag: 'TEN_MINUTES',
        });
        this.caches.sentNotifications.add(`${launch._id}_10_MINUTES`);
      }
    }

    for (const launch of launchesInOneHour) {
      if (!this.caches.sentNotifications.has(`${launch._id}_ONE_HOUR`)) {
        const message = `1 godzina do startu rakiety ${launch.rocket.name} z misją ${launch.name}!`;
        console.log(message);
        await this.notificationService.sendLaunchNotification({
          message: message,
          body: launch.description,
          tag: 'ONE_HOUR',
        });
        this.caches.sentNotifications.add(`${launch._id}_ONE_HOUR`);
      }
    }

    for (const launch of launchesIn24Hours) {
      if (
        !this.caches.sentNotifications.has(`${launch._id}_TWENTY_FOUR_HOURS`)
      ) {
        const message = `24 godziny do startu rakiety ${launch.rocket.name} z misją ${launch.name}!`;
        console.log(message);
        await this.notificationService.sendLaunchNotification({
          message: message,
          body: launch.description,
          tag: 'TWENTY_FOUR_HOURS',
        });
        this.caches.sentNotifications.add(`${launch._id}_TWENTY_FOUR_HOURS`);
      }
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async periodicCheck() {
    await this.checkForUpcomingLaunches();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  clearCache() {
    Object.values(this.caches).forEach((cache) => cache.clear());
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  clearChangeCaches() {
    [
      'changeDateLaunches',
      'changeWindowLaunches',
      'changeProbabilityLaunches',
    ].forEach((cacheKey) => this.caches[cacheKey].clear());
  }
}
