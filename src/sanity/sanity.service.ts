import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SanityClient } from '@sanity/client';

@Injectable()
export class SanityService {
  private client: SanityClient;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      projectId: this.configService.get<string>('SANITY_PROJECT_ID'),
      dataset: this.configService.get<string>('SANITY_DATASET'),
      token: this.configService.get<string>('SANITY_TOKEN'),
      useCdn: true,
    });
  }

  async fetch(query: string): Promise<any> {
    return await this.client.fetch(query);
  }

  sanityClient(): SanityClient {
    return this.client;
  }
}
