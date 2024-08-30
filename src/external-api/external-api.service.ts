import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LaunchCollection } from 'src/types/launchFromSpaceLaunchNow';

@Injectable()
export class ExternalApiService {
  private isFetchingLaunchApiData = false;
  public launchApiDataCache: LaunchCollection | null = null;
  private launchApiDataLastFetched = new Date(0);
  private firstPageLastFetched = new Date(0); // Nowe pole do przechowywania czasu ostatniego pobrania pierwszej strony

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

      // Sprawdzamy, czy minęło 3 minuty od ostatniego pobrania pierwszej strony
      const shouldFetchFirstPage =
        now.getTime() - this.firstPageLastFetched.getTime() > 3 * 60 * 1000;

      // Sprawdzamy, czy minęło 20 minut od ostatniego pobrania pełnych danych
      const shouldFetchAllData =
        !this.launchApiDataCache ||
        now.getTime() - this.launchApiDataLastFetched.getTime() >
          20 * 60 * 1000;

      if (shouldFetchFirstPage || shouldFetchAllData) {
        console.log('Fetching new data from Space Launch API');
        let allData: any[] = [];
        const url = this.configService.get<string>('LAUNCH_API_URL');
        let nextUrl: string | null = url;
        let count = 0;
        let previous: string | null = null;
        let isFirstPage = true;
        console.log(nextUrl);

        while (nextUrl) {
          // Pobieramy dane tylko, jeśli to pierwsza strona lub powinniśmy pobrać wszystkie dane
          if (isFirstPage && !shouldFetchFirstPage) {
            break;
          }

          const response = await axios.get(nextUrl).finally(() => {
            console.log('Pobralem reuqest');
          });

          const data = response.data;

          allData = allData.concat(data.results);
          nextUrl = data.next;
          count = data.count;
          previous = data.previous;

          if (isFirstPage) {
            this.firstPageLastFetched = now; // Aktualizacja czasu pobrania pierwszej strony
            isFirstPage = false;
          }
        }

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
    const shouldFetchFirstPage =
      now.getTime() - this.firstPageLastFetched.getTime() > 3 * 60 * 1000;
    const shouldFetchAllData =
      !this.launchApiDataCache ||
      now.getTime() - this.launchApiDataLastFetched.getTime() > 20 * 60 * 1000;

    if (shouldFetchFirstPage || shouldFetchAllData) {
      await this.fetchMissions();
    }
    return this.launchApiDataCache;
  }
}
