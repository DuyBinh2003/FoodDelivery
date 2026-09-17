#!/bin/bash
echo "Initializing LocalStack SQS..."

awslocal sqs create-queue --queue-name food-delivery-orders

echo "LocalStack SQS initialization completed!"
