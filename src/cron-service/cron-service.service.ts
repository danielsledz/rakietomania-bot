import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordService } from 'src/discord/discord.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { ExternalApiService } from 'src/external-api/external-api.service';
import { LaunchMonitoringService } from 'src/launch-monitoring/launch-monitoring.service';
import { SanityService } from 'src/sanity/sanity.service';
import { Rocket } from 'src/types';
// import { Mutex } from 'async-mutex';
// const mutex = new Mutex();

@Injectable()
export class CronServiceService {
  constructor(
    private readonly sanityService: SanityService,
    private readonly launchMonitoringService: LaunchMonitoringService,
    private readonly discordService: DiscordService,
    private readonly errorHandlingService: ErrorHandlingService,
    private readonly externalApiService: ExternalApiService,
  ) {}
  private isFetchingExternalData = false;
  private isFetchingExternalDataAll = false;

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
      const currentTime = new Date().getTime();

      for (const mission of missions) {
        const missionTime = new Date(mission.date).getTime();
        const timeDifference = missionTime - currentTime;

        // Sprawdz czy misja ma mniej niż 24h i nie ma przypisanej transmisji lub boostera
        this.checkAndNotify(
          timeDifference,
          24 * 60 * 60 * 1000, // 24h
          23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 50 * 1000, // 23h 59m 50s
          mission,
        );

        // Sprawdz czy misja ma mniej niż 1h i nie ma przypisanej transmisji lub boosteraa
        this.checkAndNotify(
          timeDifference,
          60 * 60 * 1000, // 1h
          59 * 60 * 1000 + 50 * 1000, // 59m 50s
          mission,
        );

        // Sprawdz czy misja ma mniej niż 20 minut i nie ma przypisanej transmisji lub boostera
        this.checkAndNotify(
          timeDifference,
          20 * 60 * 1000, // 20m
          19 * 60 * 1000 + 50 * 1000, // 19m 50s
          mission,
        );
      }
    } catch (error) {
      this.errorHandlingService.handleError(
        'Error while checking missions for missing data',
        error,
      );
    }
  }

  private async checkAndNotify(
    timeDifference: number,
    upperLimit: number,
    lowerLimit: number,
    mission: any,
  ) {
    if (timeDifference <= upperLimit && timeDifference > lowerLimit) {
      let timeUnit = 'godzin(y)';
      let timeValue = upperLimit / (60 * 60 * 1000); // Domyślnie w godzinach

      // Jeżeli górny limit to 20 minut (1200000 milisekund), wyświetl w minutachs
      if (upperLimit <= 20 * 60 * 1000) {
        timeUnit = 'minut(y)';
        timeValue = upperLimit / (60 * 1000); // Przelicz na minuty
      }

      if (!mission.livestream) {
        const title = `Zbliżający się start - brak transmisji`;
        const body = `Misja **${mission.name}** rozpocznie się za ${timeValue} ${timeUnit}, nie ma dodanej transmisji.`;
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
        const title = `Zbliżający się start - brak boostera`;
        const body = `Misja **${mission.name}** z rakietą **${rocket[0].name}** rozpocznie się za ${timeValue} ${timeUnit}, a nie ma przypisanego boostera.`;
        this.discordService.sendMessage(title, body);
      }
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

  // async fetchExternalData() {
  //   await mutex.runExclusive(async () => {
  //     console.log('---------------------');
  //     console.log('Fetching external data CROOON RUNNING');
  //     console.log('---------------------');
  //     if (this.isFetchingExternalData) {
  //       console.log('fetchExternalData is already running, skipping...');
  //       return;
  //     }
  //     this.isFetchingExternalData = true;
  //     try {
  //       await this.externalApiService.fetchFirstPage();
  //     } catch (error) {
  //       console.error('Error handling cron and checking status', error);
  //     } finally {
  //       this.isFetchingExternalData = false;
  //     }
  //   });
  // }

  // // Co 20 minut
  // @Cron('0 */20 * * * *')
  // async fetchAllData() {
  //   if (this.isFetchingExternalDataAll) {
  //     console.log('fetchExternalData is already running, skipping...');
  //     return;
  //   }

  //   this.isFetchingExternalDataAll = true;

  //   await mutex.runExclusive(async () => {
  //     try {
  //       await this.externalApiService.fetchAllData();
  //     } catch (error) {
  //       console.error('Error handling cron and checking status', error);
  //     } finally {
  //       this.isFetchingExternalDataAll = false;
  //     }
  //   });
  // }

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

  @Cron('0 */21 * * * *') // Co 21 minut
  clearChangeCaches() {
    try {
      [
        'changeDateLaunches',
        'changeWindowLaunches',
        'changeProbabilityLaunches',
        'updatedStatusLaunches',
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
