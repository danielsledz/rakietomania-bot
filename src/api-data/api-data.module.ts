import { Module } from '@nestjs/common';
import { ApiDataController } from './api-data.controller';
import { ApiDataService } from './api-data.service';
import { DiscordService } from 'src/discord/discord.service';
import { SanityService } from 'src/sanity/sanity.service';
import { SanityModule } from 'src/sanity/sanity.module';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  imports: [SanityModule],
  controllers: [ApiDataController],
  providers: [
    ApiDataService,
    DiscordService,
    SanityService,
    NotificationsService,
  ],
})
export class ApiDataModule {}
