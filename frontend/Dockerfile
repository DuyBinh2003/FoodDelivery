# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args cho environment variables tại build time
ARG NEXT_PUBLIC_API_GATEWAY_URL=/api
ARG NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL=http://api-gateway:8080/api
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
ARG NEXT_PUBLIC_USER_SERVICE_URL=http://user-service:4001
ARG NEXT_PUBLIC_ADMIN_SERVICE_URL=http://admin-service:4002
ARG NEXT_PUBLIC_RESTAURANT_SERVICE_URL=http://restaurant-service:4003
ARG NEXT_PUBLIC_ORDER_SERVICE_URL=http://order-service:4004
ARG NEXT_PUBLIC_DELIVERY_SERVICE_URL=http://delivery-service:4005
ARG NEXT_PUBLIC_SEARCH_SERVICE_URL=http://search-service:4006
ARG NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://payment-service:4007
ARG NEXT_PUBLIC_AI_SERVICE_URL=http://ai-service:5001
ARG NEXT_PUBLIC_API_TIMEOUT=10000
ARG NEXT_PUBLIC_ADMIN_WS_URL=/admin
ARG NEXT_PUBLIC_ADMIN_WS_PATH=/ws/admin/socket.io
ARG NEXT_PUBLIC_USER_WS_URL=/user
ARG NEXT_PUBLIC_USER_WS_PATH=/ws/user/socket.io
ARG NEXT_PUBLIC_DELIVERY_WS_URL=/delivery
ARG NEXT_PUBLIC_DELIVERY_WS_PATH=/ws/delivery/socket.io
ARG NEXT_PUBLIC_S3_ASSETS_URL=http://localhost:4566/food-delivery-assets

ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
ENV NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL=${NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_USER_SERVICE_URL=${NEXT_PUBLIC_USER_SERVICE_URL}
ENV NEXT_PUBLIC_ADMIN_SERVICE_URL=${NEXT_PUBLIC_ADMIN_SERVICE_URL}
ENV NEXT_PUBLIC_RESTAURANT_SERVICE_URL=${NEXT_PUBLIC_RESTAURANT_SERVICE_URL}
ENV NEXT_PUBLIC_ORDER_SERVICE_URL=${NEXT_PUBLIC_ORDER_SERVICE_URL}
ENV NEXT_PUBLIC_DELIVERY_SERVICE_URL=${NEXT_PUBLIC_DELIVERY_SERVICE_URL}
ENV NEXT_PUBLIC_SEARCH_SERVICE_URL=${NEXT_PUBLIC_SEARCH_SERVICE_URL}
ENV NEXT_PUBLIC_PAYMENT_SERVICE_URL=${NEXT_PUBLIC_PAYMENT_SERVICE_URL}
ENV NEXT_PUBLIC_AI_SERVICE_URL=${NEXT_PUBLIC_AI_SERVICE_URL}
ENV NEXT_PUBLIC_API_TIMEOUT=${NEXT_PUBLIC_API_TIMEOUT}
ENV NEXT_PUBLIC_ADMIN_WS_URL=${NEXT_PUBLIC_ADMIN_WS_URL}
ENV NEXT_PUBLIC_ADMIN_WS_PATH=${NEXT_PUBLIC_ADMIN_WS_PATH}
ENV NEXT_PUBLIC_USER_WS_URL=${NEXT_PUBLIC_USER_WS_URL}
ENV NEXT_PUBLIC_USER_WS_PATH=${NEXT_PUBLIC_USER_WS_PATH}
ENV NEXT_PUBLIC_DELIVERY_WS_URL=${NEXT_PUBLIC_DELIVERY_WS_URL}
ENV NEXT_PUBLIC_DELIVERY_WS_PATH=${NEXT_PUBLIC_DELIVERY_WS_PATH}
ENV NEXT_PUBLIC_S3_ASSETS_URL=${NEXT_PUBLIC_S3_ASSETS_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# Stage 3: Runner (production)
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tạo non-root user để bảo mật
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Tận dụng Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
