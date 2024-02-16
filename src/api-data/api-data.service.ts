import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Mission } from 'src/types';
import { data as API_DATA } from './data/launches';
import { createClient } from '@sanity/client';
import { DiscordService } from 'src/discord/discord.service';
import { createMissionEmbed } from 'src/utils/createMissionEmbed';

const sanityClient = createClient({
  projectId: 'vjzwc7w5',
  dataset: 'development',
  token:
    'ska6Z8M4I8HoomM4bVuLTaa2oS6Ik2Z8TnzNgsPBpfL9DTk1cBxzmG0fzHLiJx6q7BkaLjMJ1fFtYx6kSNyTzQVIrwKrRvbovvfGNFbiP7amHa2bVUTNlknBihNhD8sM9mRZdz68wv0Z9ttwkM0zqFWDJvi3TP4LvBZNHSpQNTF4p2iRzmvi',
  useCdn: false,
});

const httpClient = axios.create({
  baseURL: 'https://vjzwc7w5.api.sanity.io/v2023-08-01/data/query',
});

@Injectable()
export class ApiDataService {
  constructor(private readonly discordService: DiscordService) {}

  private async fetchSanityData(): Promise<Mission[]> {
    const response = await httpClient.get(
      '/development?query=*[_type=="mission"]',
    );
    return response.data.result;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    const dataFromSanity = await this.fetchSanityData();

    dataFromSanity.forEach((launch) => {
      const matchingLaunch = API_DATA.results.find(
        (launchFromAPI) => launchFromAPI.mission.name === launch.name,
      );
      if (matchingLaunch) {
        console.log(launch.name, 'already exists in the database');
        if (launch.date !== matchingLaunch.net) {
          console.log(launch.name, 'has a different date in the database');
          sanityClient
            .patch(launch._id)
            .set({ date: matchingLaunch.net })
            .commit()
            .then((updatedDocument) => {
              console.log('Updated document', updatedDocument);
            })
            .catch((err) => {
              console.error('Update failed', err.message);
            });
        }
      } else {
        console.log(launch.name, 'does not exist in the database');
      }
    });

    return dataFromSanity;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async deleteOldLaunches() {
    console.log('Deleting old launches');
    const dataFromSanity = await this.fetchSanityData();

    const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    dataFromSanity
      .filter((launch) => new Date(launch.date) < date24HoursAgo)
      .filter((launch) => !launch.archived)
      .forEach((launch) => {
        const launchDate = new Date(launch.date);
        if (launchDate < date24HoursAgo) {
          sanityClient
            .patch(launch._id)
            .set({ archived: true })
            .commit()
            .then((updatedDocument) => {
              console.log('Updated document', updatedDocument);
              this.discordService.sendMessage(createMissionEmbed(launch));
            })
            .catch((err) => {
              console.error('Delete failed', err.message);
            });
        }
      });

    return dataFromSanity;
  }
}
