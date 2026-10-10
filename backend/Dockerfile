FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY nest-cli.json ./
COPY libs ./libs

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

COPY apps/${APP_NAME} ./apps/${APP_NAME}

RUN npx nest build ${APP_NAME}

FROM node:24-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

CMD node dist/apps/${APP_NAME}/src/main.js
