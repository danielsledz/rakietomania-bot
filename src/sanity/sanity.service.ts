import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SanityClient } from '@sanity/client';

@Injectable()
export class SanityService {
  private readClient: SanityClient;
  private writeClient: SanityClient;

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('SANITY_PROJECT_ID');
    const dataset = this.configService.get<string>('SANITY_DATASET');
    const token = this.configService.get<string>('SANITY_TOKEN');

    this.readClient = createClient({
      projectId,
      dataset,
      useCdn: true, // Szybkie odczyty, potencjalnie przestarzałe dane
    });

    this.writeClient = createClient({
      projectId,
      dataset,
      token,
      useCdn: false, // Aktualne dane, ale wolniejsze odczyty
    });
  }

  async fetch(query: string): Promise<any> {
    return this.readClient.fetch(query);
  }

  sanityClient(useCdn: boolean = false): SanityClient {
    return useCdn ? this.readClient : this.writeClient;
  }
}
