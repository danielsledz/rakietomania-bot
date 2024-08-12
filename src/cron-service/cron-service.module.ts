import { Module } from '@nestjs/common';
import { CronServiceService } from './cron-service.service';
import { SanityModule } from 'src/sanity/sanity.module';
import { LaunchMonitoringModule } from 'src/launch-monitoring/launch-monitoring.module';
import { DiscordModule } from 'src/discord/discord.module';
import { ErrorHandlingModule } from 'src/error-handling/error-handling.module';
import { ExternalApiModule } from 'src/external-api/external-api.module';

@Module({
  imports: [
    SanityModule,
    LaunchMonitoringModule,
    DiscordModule,
    ErrorHandlingModule,
    ExternalApiModule,
  ],
  providers: [CronServiceService],
  exports: [CronServiceService],
})
export class CronServiceModule {}
