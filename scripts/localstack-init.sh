#!/bin/bash
set -e
echo "=== Initializing LocalStack AWS Services (region: ${AWS_DEFAULT_REGION:-ap-southeast-1}) ==="

REGION="${AWS_DEFAULT_REGION:-ap-southeast-1}"
ACCOUNT_ID="000000000000"

# Create SQS Queues
echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name food-delivery-orders --region "$REGION" --attributes MessageRetentionPeriod=300
awslocal sqs create-queue --queue-name admin-registration-queue --region "$REGION"
awslocal sqs create-queue --queue-name driver-dispatch-queue --region "$REGION"

# Create SNS Topics
echo "Creating SNS topics..."
TOPIC_ARN=$(awslocal sns create-topic --name user-registration-events --region "$REGION" --query 'TopicArn' --output text)
echo "Topic ARN: $TOPIC_ARN"

TOPIC_DRIVER_ARN=$(awslocal sns create-topic --name order-driver-dispatch --region "$REGION" --query 'TopicArn' --output text)
echo "Driver Topic ARN: $TOPIC_DRIVER_ARN"

# Subscribe admin-registration-queue to the user-registration-events SNS topic
QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:admin-registration-queue"
echo "Subscribing admin SQS queue to SNS topic..."
awslocal sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$QUEUE_ARN" \
  --region "$REGION"

# Subscribe driver-dispatch-queue to the order-driver-dispatch SNS topic
DRIVER_QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:driver-dispatch-queue"
echo "Subscribing driver SQS queue to SNS topic..."
awslocal sns subscribe \
  --topic-arn "$TOPIC_DRIVER_ARN" \
  --protocol sqs \
  --notification-endpoint "$DRIVER_QUEUE_ARN" \
  --region "$REGION"

echo "=== LocalStack initialization completed! ==="
echo "Topic ARN : $TOPIC_ARN"
echo "Queue ARN : $QUEUE_ARN"
