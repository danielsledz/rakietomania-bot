import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordService } from 'src/discord/discord.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { ExternalApiService } from 'src/external-api/external-api.service';
import { LaunchMonitoringService } from 'src/launch-monitoring/launch-monitoring.service';
import { SanityService } from 'src/sanity/sanity.service';
import { Rocket } from 'src/types';

@Injectable()
export class CronServiceService {
  constructor(
    private readonly sanityService: SanityService,
    private readonly launchMonitoringService: LaunchMonitoringService,
    private readonly discordService: DiscordService,
    private readonly errorHandlingService: ErrorHandlingService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deleteOldLaunches() {
    try {
      const dataFromSanity = await this.sanityService.fetchMissions();
      const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const outdatedLaunches = dataFromSanity.filter(
        (launch) =>
          new Date(launch.date) < date24HoursAgo &&
          !launch.archived &&
          launch.environment === 'production',
      );

      for (const launch of outdatedLaunches) {
        if (
          !this.launchMonitoringService.caches.archivedLaunches.has(launch._id)
        ) {
          const title = 'Zarchiwizowano misję';
          const body = `Misja **${launch.name}** została zarchiwizowana.`;
          this.discordService.sendMessage(title, body);
          await this.sanityService.updateSanityRecord(launch._id, {
            archived: true,
          });
          this.launchMonitoringService.caches.archivedLaunches.add(launch._id);
        }
      }
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error while deleting old launches',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkMissionsForMissingData() {
    try {
      if (!this.sanityService.sanityDataCache) {
        return;
      }
      const missions = await this.sanityService.sanityDataCache;
      const currentTime = new Date();

      for (const mission of missions) {
        const missionTime = new Date(mission.date);
        const timeDifference = missionTime.getTime() - currentTime.getTime();

        // Sprawdź, czy do startu misji została godzina, ale nie mniej niż 59 minut i 50 sekund
        if (
          timeDifference <= 60 * 60 * 1000 &&
          timeDifference > 59 * 60 * 1000 + 50 * 1000
        ) {
          if (!mission.livestream) {
            const title = 'Zbliżający się start - brak transmisji';
            const body = `Misja **${mission.name}** rozpocznie się za godzinę, nie ma dodanej transmisji.`;
            this.discordService.sendMessage(title, body);
          }

          const rocket: Rocket = await this.sanityService.fetch(
            `*[_type == "rocket" && _id == "${mission.rocket._ref}"]`,
          );

          if (
            (rocket[0].name === 'Falcon 9 Block 5' ||
              rocket[0].name === 'Falcon Heavy') &&
            !mission.boosters
          ) {
            const title = 'Zbliżający się start - brak boostera';
            const body = `Misja **${mission.name}** z rakietą **${rocket[0].name}** rozpocznie się za godzinę, a nie ma przypisanego boostera.`;
            this.discordService.sendMessage(title, body);
          }
        }

        // Sprawdź, czy do startu misji zostało między 20 minut a 19 minut i 50 sekund
        if (
          timeDifference <= 20 * 60 * 1000 &&
          timeDifference > 19 * 60 * 1000 + 50 * 1000
        ) {
          if (!mission.livestream) {
            const title = 'Zbliżający się start - brak transmisji';
            const body = `Misja **${mission.name}** rozpocznie się za 20 minut, a nadal nie ma dodanej transmisji.`;
            this.discordService.sendMessage(title, body);
          }

          const rocket: Rocket = await this.sanityService.fetch(
            `*[_type == "rocket" && _id == "${mission.rocket._ref}"]`,
          );

          if (
            (rocket[0].name === 'Falcon 9 Block 5' ||
              rocket[0].name === 'Falcon Heavy') &&
            !mission.boosters
          ) {
            const title = 'Zbliżający się start - brak boostera';
            const body = `Misja **${mission.name}** z rakietą **${rocket[0].name}** rozpocznie się za 20 minut, a nadal nie ma przypisanego boostera.`;
            this.discordService.sendMessage(title, body);
          }
        }
      }
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error while checking missions for missing data',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronAndCheckStatus() {
    try {
      const [dataFromSanity] = await Promise.all([
        this.sanityService.fetchMissions(),
      ]);

      console.log('Checking for changes in mission');

      for (const launch of dataFromSanity.filter(
        (launch) => !launch.archived,
      )) {
        const matchingLaunchFromAPI =
          this.externalApiService.launchApiDataCache?.results.find(
            (launchFromAPI) => launchFromAPI.id === launch.apiMissionID,
          );

        if (matchingLaunchFromAPI) {
          await this.launchMonitoringService.checkAndUpdateLaunch(
            launch,
            matchingLaunchFromAPI,
          );
        }
      }
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error handling cron and checking status',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async periodicCheck() {
    try {
      await this.launchMonitoringService.checkForUpcomingLaunches();
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error during periodic check for upcoming launches',
        error,
      );
    }
  }

  @Cron('0 */20 * * * *') // Co 20 minut
  async fetchExternalData() {
    try {
      await this.externalApiService.tryToFetchMissions();
    } catch (error) {
      console.error('Error handling cron and checking status', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  clearCache() {
    try {
      Object.values(this.launchMonitoringService.caches).forEach((cache) =>
        cache.clear(),
      );
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error while clearing cache',
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  clearChangeCaches() {
    try {
      [
        'changeDateLaunches',
        'changeWindowLaunches',
        'changeProbabilityLaunches',
      ].forEach((cacheKey) =>
        this.launchMonitoringService.caches[cacheKey].clear(),
      );
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error while clearing change caches',
        error,
      );
    }
  }
}
