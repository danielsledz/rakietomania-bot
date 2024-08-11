import { Injectable } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';

@Injectable()
export class ErrorHandlingService {
  constructor(private discordService: DiscordService) {}
  async handleError(message: string, error: any) {
    console.error(message, error);
    await this.discordService.sendErrorMessage(
      `BŁĄD! SERWER PRZESTAŁ DZIAŁAĆ! JEZELI DANIEL ŚPI, NALEZY GO OBUDZIĆ, INACZEJ GROZI TO ZŁĄ RENOMĄ APLIKACJI \n\n ${message} \n\n ${error.message}`,
    );
  }
}
