# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies trước (cache layer)
COPY package*.json ./
RUN npm ci

# Copy source để build
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./
COPY libs ./libs
COPY scripts ./scripts

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

COPY apps/${APP_NAME} ./apps/${APP_NAME}

# Build và resolve path aliases
RUN npx nest build ${APP_NAME} && npx tsc-alias -p apps/${APP_NAME}/tsconfig.json

# ==========================================
# Stage 2: Runner (production)
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Tạo non-root user để bảo mật
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Chỉ install production deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts từ builder
COPY --from=builder /usr/src/app/dist ./dist

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

USER nestjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "-c", "node dist/apps/${APP_NAME}/src/main.js"]
