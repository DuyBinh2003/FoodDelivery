export enum RegistrationEventTypes {
  REGISTRATION_CREATED = 'REGISTRATION_CREATED',
}

export interface RegistrationCreatedEvent {
  event: RegistrationEventTypes.REGISTRATION_CREATED;
  data: {
    id: string;
    userId: string;
    type: 'RESTAURANT' | 'DRIVER';
    payload: Record<string, any>;
    status: string;
  };
}
