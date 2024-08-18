import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'onesignal-node';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import { NotificationTimeType } from 'src/launch-monitoring/config/notificationTimeConfig';

@Injectable()
export class NotificationsService {
  private client: Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client(
      this.configService.get<string>('ONESIGNAL_APP_ID'),
      this.configService.get<string>('ONESIGNAL_REST_API_KEY'),
    );
  }

  async sendLaunchNotification(data: {
    message: string;
    body: string;
    tag: NotificationTimeType;
    image: string;
    launchId: string;
  }) {
    console.log('Sending notification:', data);
    const notification: CreateNotificationBody = {
      headings: { en: data.message },
      contents: { en: data.body },
      big_picture: data.image,
      filters: [{ field: 'tag', key: data.tag, relation: '=', value: 'true' }],
    };

    try {
      const response = await this.client.createNotification(notification);
      console.log(response.body);
    } catch (e) {
      console.log(e);
    }
  }
}
