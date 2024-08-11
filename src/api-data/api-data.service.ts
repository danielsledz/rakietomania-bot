import { Injectable } from '@nestjs/common';
import { SanityService } from 'src/sanity/sanity.service';
import { ExternalApiService } from 'src/external-api/external-api.service';
import { LaunchMonitoringService } from 'src/launch-monitoring/launch-monitoring.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';

@Injectable()
export class ApiDataService {
  constructor(
    private readonly sanityService: SanityService,
    private readonly externalApiService: ExternalApiService,
    private readonly launchMonitoringService: LaunchMonitoringService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {
    sanityService.fetchMissions();
    externalApiService.fetchMissions();
  }
}
