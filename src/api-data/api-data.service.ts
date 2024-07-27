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
      try {
        this.sanityDataCache = await this.sanityService.fetch(
          '*[_type == "mission"]',
        );
        this.sanityDataLastFetched = now;
        console.log('Fetched new data from Sanity');
      } catch (error) {
        this.handleError('Error while fetching Sanity data', error);
      }
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
        let allData = [];
        const url = this.configService.get<string>('LAUNCH_API_URL');
        let nextUrl: string | null = url;
        let count = 0;
        let previous: string | null = null;

        while (nextUrl) {
          console.log(nextUrl);
          const response = await axios.get(nextUrl);
          const data = response.data;

          allData = allData.concat(data.results);
          nextUrl = data.next; // Ustal kolejny URL do pobrania, jeśli istnieje
          count = data.count; // Aktualizuj liczbę wszystkich wyników
          previous = data.previous; // Aktualizuj poprzedni URL
        }

        this.launchApiDataCache = {
          count,
          next: null,
          previous,
          results: allData,
        };
        this.launchApiDataLastFetched = now;
      } catch (error) {
        this.handleError('Error while fetching launch data from API', error);
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
      this.handleError('Update operation failed', err);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deleteOldLaunches() {
    try {
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
    } catch (error) {
      this.handleError('Error while deleting old launches', error);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronAndCheckStatus() {
    try {
      const dataFromSanity = await this.fetchSanityData();
      const dataFromLaunchAPI = await this.getLaunchData();

      console.log('Checking for changes in mission');

      for (const launch of dataFromSanity.filter(
        (launch) => !launch.archived,
      )) {
        const matchingLaunchFromAPI = dataFromLaunchAPI.results.find(
          (launchFromAPI) => launchFromAPI.id === launch.apiMissionID,
        );

        if (!matchingLaunchFromAPI) {
          continue;
        }

        await this.checkAndUpdateLaunch(launch, matchingLaunchFromAPI);
      }

      return dataFromSanity;
    } catch (error) {
      this.handleError('Error handling cron and checking status', error);
    }
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
    try {
      await this.fetchSanityData();
      await this.fetchLaunchApiData();
      console.log('Fetched new data from APIs');
    } catch (error) {
      this.handleError('Error fetching launch data', error);
    }
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
    try {
      if (
        !this.sanityDataLastFetched ||
        !this.sanityDataCache ||
        this.sanityDataCache.length === 0
      ) {
        console.log('Sanity data cache is empty or not fetched yet.');
        return;
      }

      const currentTime = new Date();

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

      for (const launch of launchesStartingSoon) {
        if (!this.caches.sentNotifications.has(`${launch._id}_10_MINUTES`)) {
          const message = `10 minut do startu rakiety ${launch.rocket.name} z misją ${launch.name}!`;
          console.log(message);
          await this.notificationService.sendLaunchNotification({
            message: message,
            body: launch.description,
            tag: 'TEN_MINUTES',
          });
          this.discordService.sendMessageAboutNotification(message);

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
          this.discordService.sendMessageAboutNotification(message);

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
          this.discordService.sendMessageAboutNotification(message);

          this.caches.sentNotifications.add(`${launch._id}_TWENTY_FOUR_HOURS`);
        }
      }
    } catch (error) {
      this.handleError('Error checking for potential notifications ', error);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async periodicCheck() {
    try {
      await this.checkForUpcomingLaunches();
    } catch (error) {
      this.handleError(
        'Error during periodic check for upcoming launches',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  clearCache() {
    try {
      Object.values(this.caches).forEach((cache) => cache.clear());
    } catch (error) {
      this.handleError('Error while clearing cache', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  clearChangeCaches() {
    try {
      [
        'changeDateLaunches',
        'changeWindowLaunches',
        'changeProbabilityLaunches',
      ].forEach((cacheKey) => this.caches[cacheKey].clear());
    } catch (error) {
      this.handleError('Error while clearing change caches', error);
    }
  }

  private async handleError(message: string, error: any) {
    console.error(message, error);
    await this.discordService.sendErrorMessage(
      `BŁĄD! SERWER PRZESTAŁ DZIAŁAĆ! JEZELI DANIEL ŚPI, NALEZY GO OBUDZIĆ, INACZEJ GROZI TO ZŁĄ RENOMĄ APLIKACJI \n\n ${error.message}`,
    );
  }
}
