import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send-notification')
  async sendNotification(@Body() body: { message: string; body?: string }) {
    await this.notificationsService.sendNotification({ message: body.message });
    return { success: true };
  }

  // @Cron(CronExpression.EVERY_10_SECONDS)
  @Post('send-test-notification')
  async sendTestNotification() {
    await this.notificationsService.sendNotification({
      message: 'DURASZLENKO',
      body: 'Misja Starlink 25-19',
    });
    return { success: true };
  }
}
