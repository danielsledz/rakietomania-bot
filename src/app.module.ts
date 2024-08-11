import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiDataModule } from './api-data/api-data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { DiscordModule } from './discord/discord.module';
import { ConfigModule } from '@nestjs/config';
import { SanityModule } from './sanity/sanity.module';
import { SanityService } from './sanity/sanity.service';
import { ErrorHandlingService } from './error-handling/error-handling.service';
import { ExternalApiService } from './external-api/external-api.service';
import { LaunchMonitoringService } from './launch-monitoring/launch-monitoring.service';
import { CronServiceService } from './cron-service/cron-service.service';
import { ErrorHandlingModule } from './error-handling/error-handling.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { LaunchMonitoringModule } from './launch-monitoring/launch-monitoring.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ApiDataModule,
    NotificationsModule,
    DiscordModule,
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    SanityModule,
    ErrorHandlingModule,
    ExternalApiModule,
    LaunchMonitoringModule,
  ],
  providers: [
    AppService,
    SanityService,
    ErrorHandlingService,
    ExternalApiService,
    LaunchMonitoringService,
    CronServiceService,
  ],
})
export class AppModule {}
