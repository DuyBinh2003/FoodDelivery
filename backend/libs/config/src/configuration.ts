export default () => ({
  nodeEnv: process.env.NODE_ENV,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!, 10),
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE,
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  sqs: {
    endpoint: process.env.SQS_ENDPOINT,
    queueUrl: process.env.SQS_QUEUE_URL,
    driverDispatchQueueUrl: process.env.SQS_DRIVER_DISPATCH_QUEUE_URL,
    adminRegistrationQueueUrl: process.env.SQS_ADMIN_REGISTRATION_QUEUE_URL,
  },
  sns: {
    endpoint: process.env.SNS_ENDPOINT,
    orderDriverDispatchTopic: process.env.SNS_ORDER_DRIVER_DISPATCH_TOPIC,
    userRegistrationTopic: process.env.SNS_USER_REGISTRATION_TOPIC,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || process.env.LOCALSTACK_ENDPOINT,
    bucket: process.env.S3_BUCKET || 'food-delivery-assets',
    publicUrlPrefix: process.env.S3_PUBLIC_URL_PREFIX || 'http://localhost:4566/food-delivery-assets',
  },
  services: {
    orderUrl: process.env.ORDER_SERVICE_URL,
    restaurantUrl: process.env.RESTAURANT_SERVICE_URL,
    deliveryUrl: process.env.DELIVERY_SERVICE_URL,
    userUrl: process.env.USER_SERVICE_URL,
  },
});
