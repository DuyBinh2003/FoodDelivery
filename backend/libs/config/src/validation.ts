import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumberString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  NODE_ENV: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRATION: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsNumberString()
  @IsNotEmpty()
  REDIS_PORT: string;

  @IsString()
  @IsNotEmpty()
  ELASTICSEARCH_NODE: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION: string;

  @IsString()
  @IsNotEmpty()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY: string;

   @IsString()
  @IsNotEmpty()
  SQS_ENDPOINT: string;

  @IsString()
  @IsNotEmpty()
  SQS_QUEUE_URL: string;

  @IsString()
  @IsNotEmpty()
  SQS_DRIVER_DISPATCH_QUEUE_URL: string;

  @IsString()
  @IsNotEmpty()
  SNS_ENDPOINT: string;

  @IsString()
  @IsNotEmpty()
  SNS_ORDER_DRIVER_DISPATCH_TOPIC: string;

  @IsString()
  @IsNotEmpty()
  ORDER_SERVICE_URL: string;

  @IsString()
  @IsNotEmpty()
  RESTAURANT_SERVICE_URL: string;

  @IsString()
  @IsNotEmpty()
  DELIVERY_SERVICE_URL: string;

  @IsString()
  @IsNotEmpty()
  USER_SERVICE_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
