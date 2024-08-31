import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiDataModule } from './api-data/api-data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { DiscordModule } from './discord/discord.module';
import { ConfigModule } from '@nestjs/config';
import { SanityModule } from './sanity/sanity.module';
import { ErrorHandlingModule } from './error-handling/error-handling.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { LaunchMonitoringModule } from './launch-monitoring/launch-monitoring.module';
import { CronServiceModule } from './cron-service/cron-service.module';

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

    CronServiceModule,
  ],
  providers: [AppService],
})
export class AppModule {}
