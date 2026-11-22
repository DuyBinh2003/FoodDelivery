#!/usr/bin/env bash
# =============================================================
# AWS Infrastructure Setup Script — Food Delivery
# Chạy script này 1 lần để tạo toàn bộ AWS infrastructure
# trước khi sử dụng GitHub Actions CI/CD pipeline
#
# Yêu cầu:
#   - AWS CLI đã cài đặt và cấu hình (aws configure)
#   - Quyền AdministratorAccess hoặc quyền IAM/ECS/ECR tương đương
#
# Usage:
#   chmod +x scripts/setup-aws-infra.sh
#   ./scripts/setup-aws-infra.sh
# =============================================================

set -euo pipefail

# ==========================================
# CONFIGURATION — Thay đổi các giá trị này
# ==========================================
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="fd"
GITHUB_REPO="DuyBinh2003/FoodDelivery"  # Thay bằng GitHub repo của bạn

echo "🚀 Bắt đầu setup AWS Infrastructure cho Food Delivery"
echo "   AWS Account ID: $AWS_ACCOUNT_ID"
echo "   AWS Region: $AWS_REGION"
echo ""

# ==========================================
# 1. TẠO ECR REPOSITORIES
# ==========================================
echo "📦 [1/7] Tạo ECR Repositories..."

services=(
  "fd-user-service"
  "fd-admin-service"
  "fd-restaurant-service"
  "fd-order-service"
  "fd-delivery-service"
  "fd-search-service"
  "fd-payment-service"
  "fd-ai-service"
  "fd-ai-python"
  "fd-frontend"
)

for repo in "${services[@]}"; do
  aws ecr create-repository \
    --repository-name "$repo" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || echo "   ℹ️  $repo already exists"
  
  # Set lifecycle policy: giữ tối đa 10 images
  aws ecr put-lifecycle-policy \
    --repository-name "$repo" \
    --region "$AWS_REGION" \
    --lifecycle-policy-text '{
      "rules": [{
        "rulePriority": 1,
        "description": "Keep last 10 images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": {"type": "expire"}
      }]
    }' 2>/dev/null || true

  echo "   ✅ $repo"
done

# ==========================================
# 2. TẠO IAM ROLE CHO ECS EXECUTION
# ==========================================
echo ""
echo "🔐 [2/7] Tạo IAM Roles..."

# ECS Execution Role (pull ECR, write CloudWatch logs)
aws iam create-role \
  --role-name fd-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || echo "   ℹ️  fd-ecs-execution-role already exists"

aws iam attach-role-policy \
  --role-name fd-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

# Allow Secrets Manager access
aws iam put-role-policy \
  --role-name fd-ecs-execution-role \
  --policy-name fd-secrets-manager-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:'"$AWS_REGION"':'"$AWS_ACCOUNT_ID"':secret:fd/*"
    }]
  }' 2>/dev/null || true

echo "   ✅ fd-ecs-execution-role"

# ECS Task Role (SQS, SNS, S3 permissions)
aws iam create-role \
  --role-name fd-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || echo "   ℹ️  fd-ecs-task-role already exists"

aws iam put-role-policy \
  --role-name fd-ecs-task-role \
  --policy-name fd-task-permissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["sqs:*"],
        "Resource": "arn:aws:sqs:'"$AWS_REGION"':'"$AWS_ACCOUNT_ID"':food-delivery-*"
      },
      {
        "Effect": "Allow",
        "Action": ["sns:Publish", "sns:Subscribe"],
        "Resource": "arn:aws:sns:'"$AWS_REGION"':'"$AWS_ACCOUNT_ID"':*"
      },
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        "Resource": "arn:aws:s3:::fd-*/*"
      }
    ]
  }' 2>/dev/null || true

echo "   ✅ fd-ecs-task-role"

# ==========================================
# 3. TẠO IAM ROLE CHO GITHUB ACTIONS (OIDC)
# ==========================================
echo ""
echo "🔑 [3/7] Tạo IAM Role cho GitHub Actions OIDC..."

# Tạo OIDC Provider cho GitHub Actions
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
  2>/dev/null || echo "   ℹ️  OIDC Provider already exists"

# Deploy Role cho GitHub Actions
aws iam create-role \
  --role-name fd-github-actions-deploy-role \
  --assume-role-policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Principal\": {
        \"Federated\": \"arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com\"
      },
      \"Action\": \"sts:AssumeRoleWithWebIdentity\",
      \"Condition\": {
        \"StringLike\": {
          \"token.actions.githubusercontent.com:sub\": \"repo:${GITHUB_REPO}:*\"
        },
        \"StringEquals\": {
          \"token.actions.githubusercontent.com:aud\": \"sts.amazonaws.com\"
        }
      }
    }]
  }" 2>/dev/null || echo "   ℹ️  fd-github-actions-deploy-role already exists"

aws iam put-role-policy \
  --role-name fd-github-actions-deploy-role \
  --policy-name fd-deploy-policy \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"ecr:GetAuthorizationToken\",
          \"ecr:BatchCheckLayerAvailability\",
          \"ecr:GetDownloadUrlForLayer\",
          \"ecr:BatchGetImage\",
          \"ecr:InitiateLayerUpload\",
          \"ecr:UploadLayerPart\",
          \"ecr:CompleteLayerUpload\",
          \"ecr:PutImage\"
        ],
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"ecs:UpdateService\",
          \"ecs:DescribeServices\",
          \"ecs:RegisterTaskDefinition\",
          \"ecs:DescribeTaskDefinition\",
          \"ecs:ListTasks\",
          \"ecs:DescribeTasks\"
        ],
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": \"iam:PassRole\",
        \"Resource\": [
          \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/fd-ecs-execution-role\",
          \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/fd-ecs-task-role\"
        ]
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"secretsmanager:GetSecretValue\",
          \"secretsmanager:ListSecrets\"
        ],
        \"Resource\": \"arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:fd/*\"
      }
    ]
  }" 2>/dev/null || true

DEPLOY_ROLE_ARN=$(aws iam get-role --role-name fd-github-actions-deploy-role --query Role.Arn --output text)
echo "   ✅ fd-github-actions-deploy-role: $DEPLOY_ROLE_ARN"

# ==========================================
# 4. TẠO ECS CLUSTERS
# ==========================================
echo ""
echo "🏗️  [4/7] Tạo ECS Clusters..."

for env in staging production; do
  aws ecs create-cluster \
    --cluster-name "food-delivery-${env}-cluster" \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy \
      capacityProvider=FARGATE,weight=1 \
    --region "$AWS_REGION" \
    2>/dev/null || echo "   ℹ️  food-delivery-${env}-cluster already exists"
  echo "   ✅ food-delivery-${env}-cluster"
done

# ==========================================
# 5. TẠO CLOUDWATCH LOG GROUPS
# ==========================================
echo ""
echo "📊 [5/7] Tạo CloudWatch Log Groups..."

all_services=("user-service" "admin-service" "restaurant-service" "order-service" "delivery-service" "search-service" "payment-service" "ai-service" "ai-python" "frontend")

for env in staging production; do
  for svc in "${all_services[@]}"; do
    aws logs create-log-group \
      --log-group-name "/ecs/fd-${env}/${svc}" \
      --region "$AWS_REGION" \
      2>/dev/null || true
    
    aws logs put-retention-policy \
      --log-group-name "/ecs/fd-${env}/${svc}" \
      --retention-in-days 30 \
      --region "$AWS_REGION" \
      2>/dev/null || true
  done
  echo "   ✅ Log groups cho $env created"
done

# ==========================================
# 6. TẠO SECRETS TRONG AWS SECRETS MANAGER
# ==========================================
echo ""
echo "🔒 [6/7] Tạo Secret placeholders trong Secrets Manager..."
echo "   ⚠️  Bạn cần điền giá trị thực vào các secrets sau qua AWS Console!"
echo ""

for env in staging production; do
  secrets=(
    "fd/${env}/database-url"
    "fd/${env}/jwt-secret"
    "fd/${env}/aws-access-key-id"
    "fd/${env}/aws-secret-access-key"
    "fd/${env}/gemini-api-key"
    "fd/${env}/langsmith-api-key"
    "fd/${env}/tavily-api-key"
    "fd/${env}/sns-user-registration-topic"
    "fd/${env}/sqs-queue-url"
    "fd/${env}/redis-url"
  )
  
  for secret in "${secrets[@]}"; do
    aws secretsmanager create-secret \
      --name "$secret" \
      --description "Food Delivery ${env} - $(basename $secret)" \
      --secret-string "PLACEHOLDER_CHANGE_ME" \
      --region "$AWS_REGION" \
      2>/dev/null || echo "   ℹ️  $secret already exists"
  done
  echo "   ✅ Secrets cho $env created (cần điền giá trị thực!)"
done

# ==========================================
# 7. HIỂN THỊ GITHUB SECRETS CẦN THIẾT
# ==========================================
echo ""
echo "======================================================"
echo "✅ AWS Infrastructure đã được tạo thành công!"
echo "======================================================"
echo ""
echo "📋 BƯỚC TIẾP THEO — Thêm các GitHub Secrets sau vào repo:"
echo "   (GitHub → Settings → Secrets and variables → Actions)"
echo ""
echo "🔑 Shared Secrets:"
echo "   AWS_ACCOUNT_ID          = $AWS_ACCOUNT_ID"
echo "   AWS_DEPLOY_ROLE_ARN     = $DEPLOY_ROLE_ARN"
echo ""
echo "🌐 Staging Secrets:"
echo "   STAGING_APP_URL                   = https://staging.yourdomain.com"
echo "   STAGING_NEXT_PUBLIC_API_URL        = https://staging-api.yourdomain.com"
echo "   STAGING_NEXT_PUBLIC_BACKEND_URL    = https://staging-api.yourdomain.com"
echo "   STAGING_USER_SERVICE_URL           = http://fd-staging-user-service:3001"
echo "   STAGING_ADMIN_SERVICE_URL          = http://fd-staging-admin-service:3002"
echo "   STAGING_RESTAURANT_SERVICE_URL     = http://fd-staging-restaurant-service:3003"
echo "   STAGING_ORDER_SERVICE_URL          = http://fd-staging-order-service:3004"
echo "   STAGING_DELIVERY_SERVICE_URL       = http://fd-staging-delivery-service:3005"
echo "   STAGING_SEARCH_SERVICE_URL         = http://fd-staging-search-service:3006"
echo "   STAGING_PAYMENT_SERVICE_URL        = http://fd-staging-payment-service:3007"
echo "   STAGING_AI_SERVICE_URL             = http://fd-staging-ai-service:3008"
echo "   STAGING_ADMIN_WS_URL               = ws://fd-staging-admin-service:3002/admin"
echo "   STAGING_USER_WS_URL                = ws://fd-staging-user-service:3001/user"
echo "   STAGING_DATABASE_URL               = (từ Secrets Manager)"
echo "   STAGING_POSTGRES_USER              = postgres"
echo "   STAGING_POSTGRES_PASSWORD          = (mật khẩu RDS staging)"
echo "   STAGING_POSTGRES_DB                = food_delivery"
echo ""
echo "🏭 Production Secrets (tương tự, prefix PROD_):"
echo "   PROD_APP_URL, PROD_NEXT_PUBLIC_API_URL, ... (tương tự staging)"
echo ""
echo "🔒 Secrets Manager — Điền giá trị thực tại:"
echo "   https://console.aws.amazon.com/secretsmanager/home?region=$AWS_REGION"
echo ""
echo "📌 Cập nhật ACCOUNT_ID trong task-defs tại .aws/ecs/:"
echo "   find .aws/ecs -name '*.json' | xargs sed -i 's/ACCOUNT_ID/$AWS_ACCOUNT_ID/g'"
