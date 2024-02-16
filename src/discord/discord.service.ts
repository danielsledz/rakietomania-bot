import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly discordWebhookUrl =
    'https://discord.com/api/webhooks/1205560405053808651/62MBS8mMTNjxtlLI2QZCZtLN-dSa4RPj_mzSn9xgve0gk3HlDBmaEOpRV40IeK5XZXKI';

  async sendMessage(message: string | { embeds: any[] }): Promise<void> {
    const payload =
      typeof message === 'string' ? { content: message } : message;

    try {
      await axios.post(this.discordWebhookUrl, payload);
    } catch (error) {
      console.error('Error sending message to Discord', error);
      throw new Error('Error sending message to Discord');
    }
  }
}
