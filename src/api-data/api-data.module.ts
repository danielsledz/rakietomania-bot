import { Module } from '@nestjs/common';
import { ApiDataController } from './api-data.controller';
import { ApiDataService } from './api-data.service';
import { DiscordService } from 'src/discord/discord.service';

@Module({
  controllers: [ApiDataController],
  providers: [ApiDataService, DiscordService],
})
export class ApiDataModule {}
