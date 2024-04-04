import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly discordWebhookUrl: string;
  private readonly logger = new Logger(DiscordService.name);

  constructor(config: ConfigService) {
    this.discordWebhookUrl = config.get<string>('DISCORD_WEBHOOK_URL', '');
    if (!this.discordWebhookUrl) {
      this.logger.error('DISCORD_WEBHOOK_URL is not configured.');
      throw new Error('DISCORD_WEBHOOK_URL is not configured.');
    }
  }

  async sendMessage(message: string | { embeds: any[] }): Promise<void> {
    const payload =
      typeof message === 'string' ? { content: message } : message;

    try {
      await axios.post(this.discordWebhookUrl, payload);
    } catch (error) {
      this.logger.error('Error sending message to Discord', error);
      throw new Error('Error sending message to Discord');
    }
  }
}
