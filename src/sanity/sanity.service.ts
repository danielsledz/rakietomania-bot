import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SanityClient } from '@sanity/client';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { Mission } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SanityService {
  private readClient: SanityClient;
  private writeClient: SanityClient;
  public sanityDataLastFetched = new Date(0);
  public sanityDataCache: Mission[] | null = null;

  constructor(
    private configService: ConfigService,
    private errorHandlingService: ErrorHandlingService,
  ) {
    const projectId = this.configService.get<string>('SANITY_PROJECT_ID');
    const dataset = this.configService.get<string>('SANITY_DATASET');
    const token = this.configService.get<string>('SANITY_TOKEN');

    this.readClient = createClient({
      projectId,
      dataset,
      useCdn: false, // Szybkie odczyty, potencjalnie przestarzałe dane
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

  public async fetchMissions(): Promise<Mission[]> {
    const now = new Date();
    if (
      !this.sanityDataCache ||
      now.getTime() - this.sanityDataLastFetched.getTime() > 5 * 60 * 1000
    ) {
      try {
        this.sanityDataCache = await this.fetch('*[_type == "mission"]');
        this.sanityDataLastFetched = now;
        console.log('Fetched new data from Sanity');
      } catch (error) {
        this.errorHandlingService.handleError(
          'Error while fetching Sanity data',
          error,
        );
      }
    }
    return this.sanityDataCache;
  }

  async updateSanityRecord(id: string, updateFields: object): Promise<void> {
    try {
      await this.sanityClient(false).patch(id).set(updateFields).commit();
    } catch (err) {
      this.errorHandlingService.handleError('Update operation failed', err);
    }
  }

  async updateSanityRelation(
    id: string,
    relationField: string,
    newReferences: string[],
  ): Promise<void> {
    try {
      // Tworzymy tablicę obiektów referencyjnych z unikalnymi kluczami `_key`
      const referencesToAdd = newReferences.map((ref) => ({
        _type: 'reference',
        _ref: ref,
        _key: uuidv4(), // Generujemy unikalny klucz dla każdego elementu
      }));

      await this.sanityClient(false)
        .patch(id) // Określamy ID obiektu, który chcemy zaktualizować
        .setIfMissing({ [relationField]: [] }) // Upewniamy się, że pole relacji istnieje i jest tablicą
        .append(relationField, referencesToAdd) // Dodajemy nowe referencje do pola relacji
        .commit(); // Zatwierdzamy zmiany
    } catch (err) {
      this.errorHandlingService.handleError(
        'Update relation operation failed',
        err,
      );
    }
  }
}
