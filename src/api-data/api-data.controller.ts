import { Controller, Get } from '@nestjs/common';
import { ApiDataService } from './api-data.service';

@Controller('api-data')
export class ApiDataController {
  constructor(private readonly apiDataService: ApiDataService) {}

  @Get('/fetch')
  getApiData() {
    return this.apiDataService.handleCronAndCheckStatus();
  }

  @Get('/deleteOldLaunches')
  deleteOldLaunches() {
    return this.apiDataService.deleteOldLaunches();
  }
}
