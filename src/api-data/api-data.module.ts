import { Module } from '@nestjs/common';
import { ApiDataService } from './api-data.service';
import { DiscordService } from 'src/discord/discord.service';
import { SanityService } from 'src/sanity/sanity.service';
import { SanityModule } from 'src/sanity/sanity.module';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ErrorHandlingModule } from 'src/error-handling/error-handling.module';
import { LaunchMonitoringModule } from 'src/launch-monitoring/launch-monitoring.module';

@Module({
  imports: [SanityModule, LaunchMonitoringModule, ErrorHandlingModule],
  providers: [
    ApiDataService,
    DiscordService,
    SanityService,
    NotificationsService,
  ],
  exports: [ApiDataService],
})
export class ApiDataModule {}
