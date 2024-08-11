import { Module } from '@nestjs/common';
import { LaunchMonitoringService } from './launch-monitoring.service';
import { SanityModule } from 'src/sanity/sanity.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ErrorHandlingModule } from 'src/error-handling/error-handling.module';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [
    SanityModule,
    NotificationsModule,
    ErrorHandlingModule,
    DiscordModule,
  ],
  providers: [LaunchMonitoringService],
  exports: [LaunchMonitoringService],
})
export class LaunchMonitoringModule {}
