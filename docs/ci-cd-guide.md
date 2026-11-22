# 🚀 CI/CD & Deployment Guide — Food Delivery

> **Tài liệu này mô tả toàn bộ quy trình kiểm thử trước khi deploy và CD pipeline lên AWS.**

---

## 📋 Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [CI Pipeline — Kiểm thử trước deploy](#2-ci-pipeline--kiểm-thử-trước-deploy)
3. [CD Pipeline — Deploy lên AWS](#3-cd-pipeline--deploy-lên-aws)
4. [AWS Infrastructure](#4-aws-infrastructure)
5. [Hướng dẫn setup lần đầu](#5-hướng-dẫn-setup-lần-đầu)
6. [GitHub Secrets cần thiết](#6-github-secrets-cần-thiết)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Tổng quan kiến trúc

```mermaid
flowchart TD
    DEV[👨‍💻 Developer\nPush code] --> GH{GitHub Branch}

    GH -->|push to develop| STAG_PIPE[🔄 Staging Pipeline]
    GH -->|push to main| PROD_PIPE[🔄 Production Pipeline]
    GH -->|Pull Request| CI_ONLY[🔍 CI Only]

    CI_ONLY --> CI_BE[Backend CI\nLint + TypeCheck\n+ Test + Build]
    CI_ONLY --> CI_FE[Frontend CI\nLint + Build]

    STAG_PIPE --> CI_BE_S[✅ Backend CI Gate]
    STAG_PIPE --> CI_FE_S[✅ Frontend CI Gate]
    CI_BE_S --> BUILD_S[🐳 Build & Push\nto ECR]
    CI_FE_S --> BUILD_S
    BUILD_S --> MIGRATE_S[🗃️ DB Migration\nStaging RDS]
    MIGRATE_S --> DEPLOY_S[🚀 Deploy to\nECS Staging]
    DEPLOY_S --> STAGING[🌐 Staging\nEnvironment]

    PROD_PIPE --> CI_BE_P[✅ Backend CI Gate]
    PROD_PIPE --> CI_FE_P[✅ Frontend CI Gate]
    CI_BE_P --> BUILD_P[🐳 Build & Push\nto ECR]
    CI_FE_P --> BUILD_P
    BUILD_P --> MIGRATE_P[🗃️ DB Migration\nProduction RDS]
    MIGRATE_P --> DEPLOY_P[🏭 Deploy to\nECS Production]
    DEPLOY_P --> PROD[🌐 Production\nEnvironment]
```

---

## 2. CI Pipeline — Kiểm thử trước deploy

### Workflow Files

| File | Trigger | Mục đích |
|------|---------|----------|
| `.github/workflows/ci-backend.yml` | Push/PR vào `main`, `develop` (backend/**) | Backend quality gate |
| `.github/workflows/ci-frontend.yml` | Push/PR vào `main`, `develop` (frontend/**) | Frontend quality gate |

### Backend CI Gate (4 bước bắt buộc)

```
1. 🧹 Lint        → oxlint apps/ libs/ && node scripts/check-imports.js (0 warnings/errors)
2. 🔎 TypeCheck   → tsc --noEmit (0 errors)
3. 🧪 Unit Tests  → vitest run (100% pass)
4. 🏗️ Build Check → nest build (thành công)
```

### Frontend CI Gate (2 bước)

```
1. 🧹 Lint   → eslint (0 warnings/errors)
2. 🏗️ Build  → next build (thành công)
```

> **Quan trọng**: CD pipeline sẽ **KHÔNG** chạy nếu bất kỳ bước CI nào thất bại.

---

## 3. CD Pipeline — Deploy lên AWS

### Workflow Files

| File | Trigger | Target |
|------|---------|--------|
| `.github/workflows/cd-staging.yml` | Push vào `develop` | ECS Staging Cluster |
| `.github/workflows/cd-production.yml` | Push vào `main` | ECS Production Cluster |

### Luồng CD (4 giai đoạn)

```
Phase 1: CI Gate        → Chạy Backend CI + Frontend CI
Phase 2: Build & Push   → Build 10 Docker images → Push lên Amazon ECR
Phase 3: DB Migration   → Chạy npm run migrate:all trên RDS
Phase 4: Deploy         → Rolling update 10 ECS services
```

### Services được deploy

| Service | Port | Image ECR | CPU (Prod) | RAM (Prod) |
|---------|------|-----------|------------|------------|
| user-service | 3001 | `fd-user-service` | 1024 | 2048 MB |
| admin-service | 3002 | `fd-admin-service` | 1024 | 2048 MB |
| restaurant-service | 3003 | `fd-restaurant-service` | 1024 | 2048 MB |
| order-service | 3004 | `fd-order-service` | 1024 | 2048 MB |
| delivery-service | 3005 | `fd-delivery-service` | 1024 | 2048 MB |
| search-service | 3006 | `fd-search-service` | 1024 | 2048 MB |
| payment-service | 3007 | `fd-payment-service` | 1024 | 2048 MB |
| ai-service | 3008 | `fd-ai-service` | 2048 | 4096 MB |
| ai-python | 8000 | `fd-ai-python` | 2048 | 4096 MB |
| frontend | 3000 | `fd-frontend` | 1024 | 2048 MB |

### Image Tagging Strategy

| Environment | Tag format | Ví dụ |
|-------------|-----------|-------|
| Staging | `staging-<7-char-sha>` | `staging-a1b2c3d` |
| Production | `prod-<7-char-sha>` | `prod-e4f5g6h` |
| Staging latest | `staging-latest` | `staging-latest` |
| Production latest | `latest` | `latest` |

---

## 4. AWS Infrastructure

### Services được sử dụng

```
┌─────────────────────────────────────────────────────┐
│                    AWS ap-southeast-1               │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │   Amazon    │    │     Amazon ECS Fargate    │   │
│  │    ECR      │───▶│                          │   │
│  │  (10 repos) │    │  Staging Cluster          │   │
│  └─────────────┘    │  Production Cluster       │   │
│                     │  (10 services each)       │   │
│  ┌─────────────┐    └──────────────────────────┘   │
│  │  Amazon     │                                    │
│  │    RDS      │    ┌──────────────────────────┐   │
│  │ PostgreSQL  │    │    Amazon ElastiCache     │   │
│  └─────────────┘    │        Redis              │   │
│                     └──────────────────────────┘   │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │  Amazon     │    │  Amazon CloudWatch Logs  │   │
│  │  OpenSearch │    │  (30-day retention)       │   │
│  └─────────────┘    └──────────────────────────┘   │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │  AWS SNS    │    │  AWS SQS                 │   │
│  │  (Topics)   │    │  (Queues)                │   │
│  └─────────────┘    └──────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          AWS Secrets Manager                │   │
│  │  fd/staging/*  &  fd/production/*           │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### ECS Task Definitions

Task definition files nằm tại:
```
.aws/ecs/
├── staging/
│   ├── user-service-task-def.json
│   ├── admin-service-task-def.json
│   ├── restaurant-service-task-def.json
│   ├── order-service-task-def.json
│   ├── delivery-service-task-def.json
│   ├── search-service-task-def.json
│   ├── payment-service-task-def.json
│   ├── ai-service-task-def.json
│   ├── ai-python-task-def.json
│   └── frontend-task-def.json
└── production/
    └── (tương tự, tài nguyên gấp đôi)
```

---

## 5. Hướng dẫn setup lần đầu

### Bước 1: Chạy AWS Infrastructure Setup Script

```bash
# Trên Linux/Mac (cần AWS CLI đã cấu hình)
chmod +x scripts/setup-aws-infra.sh
./scripts/setup-aws-infra.sh
```

Script sẽ tự động tạo:
- ✅ 10 ECR repositories
- ✅ IAM Roles (ECS execution, task, GitHub Actions OIDC)
- ✅ 2 ECS Clusters (staging + production)
- ✅ CloudWatch Log Groups (20 groups)
- ✅ Secrets Manager placeholders

### Bước 2: Cập nhật ACCOUNT_ID trong Task Definitions

```bash
# Lấy AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Replace placeholder trong tất cả task-def files
find .aws/ecs -name "*.json" -exec sed -i "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" {} \;
```

### Bước 3: Điền giá trị thực vào Secrets Manager

Vào [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/) và cập nhật các secrets:

```
fd/staging/database-url          → postgresql://user:pass@rds-endpoint:5432/food_delivery
fd/staging/jwt-secret            → (random secret key)
fd/staging/aws-access-key-id     → (AWS IAM key)
fd/staging/aws-secret-access-key → (AWS IAM secret)
fd/staging/gemini-api-key        → (Gemini API key)
fd/staging/langsmith-api-key     → (LangSmith key)
fd/staging/tavily-api-key        → (Tavily key)
fd/staging/sns-user-registration-topic → arn:aws:sns:...
fd/staging/sqs-queue-url         → https://sqs...
fd/staging/redis-url             → redis://...
```

### Bước 4: Tạo ECS Services trên AWS Console

Với mỗi service trong mỗi cluster:
1. Vào ECS Console → Cluster → Create Service
2. Launch type: **FARGATE**
3. Task definition: chọn từ `.aws/ecs/<env>/<service>-task-def.json`
4. Service name: `fd-<env>-<service>`
5. Desired count: 1 (staging), 2 (production)
6. Deployment type: **Rolling update**
7. Load balancer: (tùy chọn — Application Load Balancer)

### Bước 5: Thêm GitHub Secrets

Xem chi tiết tại [Mục 6](#6-github-secrets-cần-thiết).

---

## 6. GitHub Secrets cần thiết

> **Path**: Repository → Settings → Secrets and variables → Actions

### Shared Secrets

| Secret | Giá trị |
|--------|---------|
| `AWS_ACCOUNT_ID` | AWS Account ID (12 chữ số) |
| `AWS_DEPLOY_ROLE_ARN` | ARN của `fd-github-actions-deploy-role` |

### Staging Secrets (prefix: `STAGING_`)

| Secret | Mô tả |
|--------|-------|
| `STAGING_APP_URL` | URL frontend staging |
| `STAGING_NEXT_PUBLIC_API_URL` | URL API gateway staging |
| `STAGING_NEXT_PUBLIC_BACKEND_URL` | URL backend staging |
| `STAGING_USER_SERVICE_URL` | Internal URL user-service |
| `STAGING_ADMIN_SERVICE_URL` | Internal URL admin-service |
| `STAGING_RESTAURANT_SERVICE_URL` | Internal URL restaurant-service |
| `STAGING_ORDER_SERVICE_URL` | Internal URL order-service |
| `STAGING_DELIVERY_SERVICE_URL` | Internal URL delivery-service |
| `STAGING_SEARCH_SERVICE_URL` | Internal URL search-service |
| `STAGING_PAYMENT_SERVICE_URL` | Internal URL payment-service |
| `STAGING_AI_SERVICE_URL` | Internal URL ai-service |
| `STAGING_ADMIN_WS_URL` | WebSocket URL admin |
| `STAGING_USER_WS_URL` | WebSocket URL user |
| `STAGING_DATABASE_URL` | PostgreSQL connection string |
| `STAGING_POSTGRES_USER` | DB username |
| `STAGING_POSTGRES_PASSWORD` | DB password |
| `STAGING_POSTGRES_DB` | DB name |

### Production Secrets (prefix: `PROD_`)

Tương tự Staging nhưng dùng prefix `PROD_`.

---

## 7. Troubleshooting

### ❌ CI thất bại — Lỗi Lint

```bash
# Chạy local để xem lỗi
cd backend && npm run lint
cd frontend && npm run lint
```

### ❌ CI thất bại — Lỗi TypeScript

```bash
cd backend && npx tsc --noEmit
```

### ❌ CI thất bại — Test fail

```bash
cd backend && npm test
```

### ❌ Docker build thất bại

```bash
# Test build local
docker build -t test-build --build-arg APP_NAME=user-service ./backend
docker build -t test-frontend ./frontend
```

### ❌ ECS deployment không stable

1. Vào ECS Console → Service → Events tab
2. Kiểm tra CloudWatch Logs: `/ecs/fd-<env>/<service>`
3. Xác nhận Health Check đang pass

### ❌ DB Migration thất bại

```bash
# Chạy migration thủ công với production DATABASE_URL
cd backend
DATABASE_URL=<prod-url> npm run migrate:all
```

### ⚠️ Rollback khi production lỗi

```bash
# Force ECS về task definition cũ
aws ecs update-service \
  --cluster food-delivery-production-cluster \
  --service fd-prod-user-service \
  --task-definition fd-prod-user-service:<revision-cũ>
```

---

## Branching Strategy

```
main (protected)   ← PR từ develop sau khi staging test OK
  ↑                   → Auto-deploy Production
  |
develop            ← PR từ feature/* branches
  ↑                   → Auto-deploy Staging
  |
feature/<name>     ← Làm việc hàng ngày
  |                   → Chạy CI khi mở PR
```

---

*Cập nhật lần cuối: 2026-11-22 | Phiên bản: 1.0.0*
