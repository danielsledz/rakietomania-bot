import { Module } from '@nestjs/common';
import { SanityService } from './sanity.service';
import { ErrorHandlingModule } from 'src/error-handling/error-handling.module';

@Module({
  imports: [ErrorHandlingModule],
  providers: [SanityService],
  exports: [SanityService],
})
export class SanityModule {}
