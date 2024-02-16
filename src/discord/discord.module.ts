import { Module } from '@nestjs/common';
import { AppController } from './discord.controller';
import { DiscordService } from './discord.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [DiscordService],
})
export class DiscordModule {}
