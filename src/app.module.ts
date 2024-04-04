import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiDataModule } from './api-data/api-data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { DiscordModule } from './discord/discord.module';
import { ConfigModule } from '@nestjs/config';
import { SanityModule } from './sanity/sanity.module';
import { SanityService } from './sanity/sanity.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ApiDataModule,
    NotificationsModule,
    DiscordModule,
    ConfigModule.forRoot({
      envFilePath: ['.env.development', '.env.production'],
      isGlobal: true,
    }),
    SanityModule,
  ],
  controllers: [AppController],
  providers: [AppService, SanityService],
})
export class AppModule {}
