import { Module, Global } from '@nestjs/common';
import { MockNotificationService } from './mock-notification.service';
import { MockSqsService } from './mock-sqs.service';
import { MockBillerService } from './mock-biller.service';
import { SqsWorkerService } from './sqs-worker.service';

@Global()
@Module({
  providers: [
    MockNotificationService,
    MockSqsService,
    MockBillerService,
    SqsWorkerService,
  ],
  exports: [
    MockNotificationService,
    MockSqsService,
    MockBillerService,
    SqsWorkerService,
  ],
})
export class ExternalServicesModule {}