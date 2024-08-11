import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordService } from 'src/discord/discord.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { ExternalApiService } from 'src/external-api/external-api.service';
import { LaunchMonitoringService } from 'src/launch-monitoring/launch-monitoring.service';
import { SanityService } from 'src/sanity/sanity.service';

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
          this.discordService.sendMessage(
            'Archived mission: ' + launch.name,
            launch.apiMissionID,
          );
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

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronAndCheckStatus() {
    try {
      const [dataFromSanity] = await Promise.all([
        this.sanityService.fetchMissions(),
      ]);

      console.log('Checking for changes in mission');
      console.log('dataFromSanity', dataFromSanity.length);

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
