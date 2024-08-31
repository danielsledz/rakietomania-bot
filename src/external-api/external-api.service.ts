import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LaunchCollection } from 'src/types/launchFromSpaceLaunchNow';
import { Mutex } from 'async-mutex';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ExternalApiService {
  launchApiDataCache: LaunchCollection | null = null;
  private launchApiDataLastFetched = new Date(0);
  private firstPageLastFetched = new Date(0);
  private fetchMutex = new Mutex();

  constructor(private readonly configService: ConfigService) {
    console.log('ExternalApiService instantiated');
  }

  @Cron(CronExpression.EVERY_30_SECONDS) // Co 30 sekund
  public async fetchFirstPage(): Promise<LaunchCollection | null> {
    return this.fetchMutex.runExclusive(async () => {
      console.log('---------------------');
      console.log('Fetching external data CROOON RUNNING');
      console.log('---------------------');
      const now = new Date();

      if (now.getTime() - this.firstPageLastFetched.getTime() < 27 * 1000) {
        console.log(
          'Skipping fetchFirstPage because 30 seconds have not passed yet.',
        );
        return this.launchApiDataCache;
      }

      const url = this.configService.get<string>('LAUNCH_API_URL');
      const token = this.configService.get<string>('API_TOKEN');

      console.log(token);

      try {
        console.log(
          'Fetching first page from Space Launch API - ',
          now.toTimeString(),
        );
        console.log('URL:', url);
        const response = await axios.get(url, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        const data = response.data;

        if (this.launchApiDataCache) {
          this.launchApiDataCache.results = data.results;
        } else {
          this.launchApiDataCache = {
            count: data.count,
            next: data.next,
            previous: data.previous,
            results: data.results,
          };
        }

        this.firstPageLastFetched = new Date(); // Update last fetched time for the first page
      } catch (error) {
        console.error(
          'Error while fetching first page from Space Launch API',
          error,
        );
      }

      return this.launchApiDataCache;
    });
  }

  // Co 20 minut
  @Cron('0 */20 * * * *')
  public async fetchAllData(): Promise<LaunchCollection | null> {
    return this.fetchMutex.runExclusive(async () => {
      const now = new Date();

      if (
        now.getTime() - this.launchApiDataLastFetched.getTime() <
        20 * 60 * 1000
      ) {
        console.log(
          'Skipping fetchAllData because 20 minutes have not passed yet.',
        );
        return this.launchApiDataCache;
      }

      const url = this.configService.get<string>('LAUNCH_API_URL');
      const token = this.configService.get<string>('API_TOKEN');

      let allData: any[] = [];
      let nextUrl: string | null = url;

      try {
        console.log('Fetching all data from Space Launch API');
        while (nextUrl) {
          console.log('URL:', nextUrl);
          const response = await axios.get(nextUrl, {
            headers: {
              Authorization: `Token ${token}`,
            },
          });

          const data = response.data;

          allData = allData.concat(data.results);
          nextUrl = data.next;
        }

        this.launchApiDataCache = {
          count: allData.length,
          next: null,
          previous: null,
          results: allData,
        };
        this.launchApiDataLastFetched = new Date(); // Update last fetched time for all data
      } catch (error) {
        console.error(
          'Error while fetching all data from Space Launch API',
          error,
        );
      }

      return this.launchApiDataCache;
    });
  }
}
