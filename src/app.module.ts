import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiDataModule } from './api-data/api-data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ApiDataModule,
    NotificationsModule,
    DiscordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
