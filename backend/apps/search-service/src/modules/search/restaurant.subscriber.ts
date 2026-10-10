import { Injectable } from '@nestjs/common';

@Injectable()
export class RestaurantSubscriber {
  // Originally this was a TypeORM subscriber listening to Restaurant changes.
  // In Microservices, we should use SQS to listen to Restaurant updates.
  // For now, this is a placeholder.
}
