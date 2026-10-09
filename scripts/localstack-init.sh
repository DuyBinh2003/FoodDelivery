#!/bin/bash
echo "Initializing LocalStack AWS Services..."
awslocal sqs create-queue --queue-name food-delivery-orders
awslocal sqs create-queue --queue-name admin-registration-queue
awslocal sns create-topic --name user-registration-events
awslocal sns subscribe --topic-arn arn:aws:sns:us-east-1:000000000000:user-registration-events --protocol sqs --notification-endpoint arn:aws:sqs:us-east-1:000000000000:admin-registration-queue
echo "LocalStack initialization completed!"
