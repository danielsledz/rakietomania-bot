import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LaunchCollection } from 'src/types/launchFromSpaceLaunchNow';
import { Mutex } from 'async-mutex';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ExternalApiService {
  launchApiDataCache: LaunchCollection = {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };

  private launchApiDataLastFetched = new Date(0);
  private firstPageLastFetched = new Date(0);
  private firstPageData: LaunchCollection | null = null;
  private allData: LaunchCollection | null = null;
  private fetchMutex = new Mutex();

  constructor(private readonly configService: ConfigService) {
    console.log('ExternalApiService instantiated');
  }

  @Cron('0 */2 * * * *')
  public async fetchFirstPage(): Promise<LaunchCollection | null> {
    return this.fetchMutex.runExclusive(async () => {
      const now = new Date();

      if (now.getTime() - this.firstPageLastFetched.getTime() < 120 * 1000) {
        console.log(
          'Skipping fetchFirstPage because 2 minutes have not passed yet.',
        );
        return this.launchApiDataCache;
      }

      const url = this.configService.get<string>('LAUNCH_API_URL');
      const token = this.configService.get<string>('API_TOKEN');

      try {
        console.log(now.toTimeString(), 'URL:', url);
        const response = await axios.get(url, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        this.firstPageData = response.data; // Zapisz dane z pierwszej strony
        this.updateLaunchApiDataCache(); // Zaktualizuj cache po pobraniu danych
        this.firstPageLastFetched = new Date(); // Aktualizacja czasu
      } catch (error) {
        console.error(
          'Error while fetching first page from Space Launch API',
          error,
        );
      }

      return this.launchApiDataCache;
    });
  }

  @Cron('0 */10 * * * *')
  public async fetchAllData(): Promise<LaunchCollection | null> {
    return this.fetchMutex.runExclusive(async () => {
      const now = new Date();

      if (
        now.getTime() - this.launchApiDataLastFetched.getTime() <
        10 * 60 * 1000
      ) {
        console.log(
          'Skipping fetchAllData because 10 minutes have not passed yet.',
        );
        return this.launchApiDataCache;
      }

      const url = this.configService.get<string>('LAUNCH_API_URL');
      const token = this.configService.get<string>('API_TOKEN');

      let allData: any[] = [];
      let nextUrl: string | null = url;
      let skipFirstPage = true;

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

          if (skipFirstPage) {
            skipFirstPage = false;
            nextUrl = data.next;
            continue; // Pomiń dane z pierwszej strony, jeśli fetchowane są osobno
          }

          allData = allData.concat(data.results);
          nextUrl = data.next;
        }

        this.allData = { ...this.launchApiDataCache, results: allData }; // Zapisz dane
        this.updateLaunchApiDataCache(); // Zaktualizuj cache po pobraniu danych
        this.launchApiDataLastFetched = new Date(); // Aktualizacja czasu
      } catch (error) {
        console.error(
          'Error while fetching all data from Space Launch API',
          error,
        );
      }

      return this.launchApiDataCache;
    });
  }

  private updateLaunchApiDataCache() {
    if (this.firstPageData && this.allData) {
      // Zaktualizowanie cache przez połączenie danych z pierwszej strony i pozostałych danych
      this.launchApiDataCache = {
        ...this.launchApiDataCache,
        results: [
          ...this.firstPageData.results, // Dane z pierwszej strony
          ...this.allData.results.filter(
            (result) =>
              !this.firstPageData!.results.some(
                (newResult) => newResult.id === result.id,
              ),
          ), // Zachowaj resztę wyników, pomijając duplikaty
        ],
        count: this.allData.results.length + this.firstPageData.results.length,
        next: this.allData.next,
        previous: this.allData.previous,
      };

      console.log(
        'this.launchApiDataCache.count: ',
        this.launchApiDataCache.count,
      );
    }
  }
}
