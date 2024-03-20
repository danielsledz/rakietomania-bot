import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mission } from 'src/types';
import { data as API_DATA } from './data/launches';
import { createClient } from '@sanity/client';
import { DiscordService } from 'src/discord/discord.service';
import { Statuses } from './data/statuses';

// It's better to move the Sanity client configuration to a separate module or file.
const sanityClient = createClient({
  projectId: 'vjzwc7w5',
  dataset: 'development',
  token: 'your_token_here',
  useCdn: true,
});

@Injectable()
export class ApiDataService {
  constructor(private readonly discordService: DiscordService) {}

  private async fetchSanityData(): Promise<Mission[]> {
    const response = await sanityClient.fetch('*[_type == "mission"]');
    console.log('Fetched data from Sanity', response);
    return response;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async deleteOldLaunches() {
    const dataFromSanity = await this.fetchSanityData();
    const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const outdatedLaunches = dataFromSanity.filter(
      (launch) =>
        new Date(launch.date) < date24HoursAgo &&
        !launch.archived &&
        launch.environment === 'production',
    );

    outdatedLaunches.forEach((launch) => {
      sanityClient
        .patch(launch._id)
        .set({ archived: true })
        .commit()
        .catch((err) => console.error('Archive failed', err.message));
    });

    return dataFromSanity;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronAndCheckStatus() {
    const dataFromSanity = await this.fetchSanityData();

    dataFromSanity.forEach((launch: Mission) => {
      const matchingLaunchFromAPI = API_DATA.results.find(
        (launchFromAPI) => launchFromAPI.mission.name === launch.name,
      );

      if (!matchingLaunchFromAPI) {
        console.log(launch.name, 'does not exist in the database');
        return;
      }

      console.log(launch.name, 'already exists in the database');

      if (
        launch.date !== matchingLaunchFromAPI.net &&
        launch.dateUpdateMethod === 'auto' &&
        !launch.archived
      ) {
        console.log(launch.name, 'has a different date in the database');
        sanityClient
          .patch(launch._id)
          .set({ date: matchingLaunchFromAPI.net })
          .commit()
          .catch((err) => console.error('Update failed', err.message));
      }

      const externalAPIStatus = Statuses.find(
        (status) =>
          status.externalAPIStatus === matchingLaunchFromAPI.status.abbrev,
      );

      if (!externalAPIStatus || launch.status === externalAPIStatus.myAPIStatus)
        return;

      console.log(launch.status, externalAPIStatus.myAPIStatus);
      sanityClient
        .patch(launch._id)
        .set({ status: externalAPIStatus.myAPIStatus })
        .commit()
        .catch((err) => console.error('Update failed', err.message));
    });

    return dataFromSanity;
  }
}
