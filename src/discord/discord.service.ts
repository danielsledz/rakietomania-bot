import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly discordWebhookUrl: string;
  private readonly logger = new Logger(DiscordService.name);
  private lastSentMessages: Map<string, number> = new Map(); // Map to store the last sent messages and their timestamps
  private readonly MESSAGE_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor(config: ConfigService) {
    this.discordWebhookUrl = config.get<string>('DISCORD_WEBHOOK_URL', '');
    if (!this.discordWebhookUrl) {
      this.logger.error('DISCORD_WEBHOOK_URL is not configured.');
      throw new Error('DISCORD_WEBHOOK_URL is not configured.');
    }
  }

  private canSendMessage(message: string): boolean {
    const now = Date.now();
    const lastSentTime = this.lastSentMessages.get(message);

    if (!lastSentTime || now - lastSentTime > this.MESSAGE_EXPIRATION_TIME) {
      this.lastSentMessages.set(message, now);
      return true;
    }

    return false;
  }

  async sendMessageAboutNotification(message: string) {
    if (!this.canSendMessage(message)) {
      this.logger.warn(
        `Message not sent. Duplicate message within 10 minutes: ${message}`,
      );
      return;
    }

    const payload = {
      embeds: [
        {
          title: 'Wysłano powiadomienie',
          description: message,
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
    if (!this.canSendMessage(message)) {
      this.logger.warn(
        `Message not sent. Duplicate message within 10 minutes: ${message}`,
      );
      return;
    }

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
    if (!this.canSendMessage(message)) {
      this.logger.warn(
        `Error message not sent. Duplicate message within 10 minutes: ${message}`,
      );
      return;
    }

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
