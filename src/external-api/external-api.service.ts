import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LaunchCollection } from 'src/types/launchFromSpaceLaunchNow';

@Injectable()
export class ExternalApiService {
  private isFetchingLaunchApiData = false;
  public launchApiDataCache: LaunchCollection | null = null;
  private launchApiDataLastFetched = new Date(0);

  constructor(private readonly configService: ConfigService) {}

  private fetchLock: Promise<void> | null = null;

  async fetchMissions(): Promise<LaunchCollection> {
    while (this.fetchLock) {
      await this.fetchLock;
    }

    let resolveLock: () => void;
    this.fetchLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      if (this.isFetchingLaunchApiData) return this.launchApiDataCache;

      this.isFetchingLaunchApiData = true;
      const now = new Date();
      if (
        !this.launchApiDataCache ||
        now.getTime() - this.launchApiDataLastFetched.getTime() > 20 * 60 * 1000
      ) {
        console.log('Fetching new data from Space Launch API');
        let allData: any[] = [];
        const url = this.configService.get<string>('LAUNCH_API_URL');
        let nextUrl: string | null = url;
        let count = 0;
        let previous: string | null = null;

        // while (nextUrl) {
        console.log(nextUrl);

        const response = await axios.get(nextUrl).finally(() => {
          console.log('Pobralem reuqest');
        });

        const data = response.data;

        allData = allData.concat(data.results);
        nextUrl = null;
        count = data.count;
        previous = data.previous;
        // }

        this.launchApiDataCache = {
          count,
          next: null,
          previous,
          results: allData,
        };
        this.launchApiDataLastFetched = now;
      }
      this.isFetchingLaunchApiData = false;
    } catch (error) {
      console.error('Error while fetching launch data from API', error);
    } finally {
      resolveLock!();
      this.fetchLock = null;
    }

    return this.launchApiDataCache;
  }

  async tryToFetchMissions(): Promise<LaunchCollection> {
    const now = new Date();
    if (
      !this.launchApiDataCache ||
      now.getTime() - this.launchApiDataLastFetched.getTime() > 20 * 60 * 1000
    ) {
      await this.fetchMissions();
    }
    return this.launchApiDataCache;
  }
}
