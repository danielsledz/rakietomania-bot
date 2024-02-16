// app.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { DiscordService } from './discord.service';

@Controller('discord')
export class AppController {
  constructor(private readonly discordService: DiscordService) {}

  @Post('console-log')
  async consoleLog(@Body() message: string): Promise<{ success: boolean }> {
    console.log(message);
    return { success: true };
  }

  @Post('send-message')
  async sendMessage(
    @Body('message') message: string,
  ): Promise<{ success: boolean }> {
    await this.discordService.sendMessage(message);
    return { success: true };
  }
}
