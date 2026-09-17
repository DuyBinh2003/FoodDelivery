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
  },
});
