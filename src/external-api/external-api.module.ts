import { Global, Module } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';

@Global()
@Module({
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}
