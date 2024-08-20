import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'onesignal-node';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import { NotificationTimeType } from 'src/launch-monitoring/config/notificationTimeConfig';

@Injectable()
export class NotificationsService {
  private client: Client;
  private notificationCache: Map<string, Date>;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client(
      this.configService.get<string>('ONESIGNAL_APP_ID'),
      this.configService.get<string>('ONESIGNAL_REST_API_KEY'),
    );
    this.notificationCache = new Map<string, Date>();
  }

  // Funkcje pomocnicze do blokowania powiadomień
  private lockedNotifications: Set<string> = new Set();

  private lockNotification(notificationKey: string): boolean {
    if (this.lockedNotifications.has(notificationKey)) {
      return false;
    }
    this.lockedNotifications.add(notificationKey);
    return true;
  }

  private unlockNotification(notificationKey: string): void {
    this.lockedNotifications.delete(notificationKey);
  }

  async sendLaunchNotification(data: {
    message: string;
    body: string;
    tag: NotificationTimeType;
    image: string;
    launchId: string;
  }) {
    console.log('Attempting to send notification:', data);

    const notificationKey = `${data.message}_${data.launchId}`;
    const now = new Date();

    // Sprawdzenie, czy powiadomienie było wysyłane w ciągu ostatnich 30 minut
    if (this.notificationCache.has(notificationKey)) {
      const lastSent = this.notificationCache.get(notificationKey);
      const timeDifference = now.getTime() - lastSent.getTime();

      if (timeDifference < 30 * 60 * 1000) {
        // 30 minut
        console.log('Notification already sent within the last 30 minutes.');
        return;
      }
    }

    // Zastosowanie blokady
    if (!this.lockNotification(notificationKey)) {
      console.log(
        'Another process is already sending notification:',
        notificationKey,
      );
      return;
    }

    const notification: CreateNotificationBody = {
      headings: { en: data.message },
      contents: { en: data.body },
      big_picture: data.image,
      filters: [{ field: 'tag', key: data.tag, relation: '=', value: 'true' }],
    };

    try {
      const response = await this.client.createNotification(notification);
      console.log(response.body);

      // Zaktualizuj cache po udanym wysłaniu powiadomienia
      this.notificationCache.set(notificationKey, now);
    } catch (e) {
      console.log('Error sending notification:', e);
    } finally {
      this.unlockNotification(notificationKey); // Zwolnienie blokady
    }
  }
}
