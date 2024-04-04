import { Module } from '@nestjs/common';
import { SanityController } from './sanity.controller';
import { SanityService } from './sanity.service';

@Module({
  controllers: [SanityController],
  providers: [SanityService],
  exports: [SanityService],
})
export class SanityModule {}
