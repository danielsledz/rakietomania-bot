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

  async sendMessageAboutNotification(message: string) {
    const payload = {
      embeds: [
        {
          title: 'Wysłano powiadomienie',
          description: message,
          color: 'blue',
        },
      ],
    };

    try {
      await axios.post(this.discordWebhookUrl, payload);
    } catch (error) {
      this.logger.error('Error sending message to Discord', error);
      throw new Error('Error sending message to Discord');
    }
  }

  async sendMessage(message: string, id: string): Promise<void> {
    const payload = {
      embeds: [
        {
          title: message,
          description: 'ID: ' + id,
          color: 0x00ff00,
        },
      ],
    };

    try {
      await axios.post(this.discordWebhookUrl, payload);
    } catch (error) {
      this.logger.error('Error sending message to Discord', error);
      throw new Error('Error sending message to Discord');
    }
  }

  async sendErrorMessage(message: string): Promise<void> {
    const payload = {
      embeds: [
        {
          title: message,
          color: 0xff0000,
          description: '<@501791282121670690>',
        },
      ],
    };

    try {
      await axios.post(this.discordWebhookUrl, payload);
    } catch (error) {
      this.logger.error('Error sending message to Discord', error);
      throw new Error('Error sending message to Discord');
    }
  }
}
