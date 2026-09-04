FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG APP
RUN npx nest build ${APP} && echo "Built files" && find dist -name "main.js"

FROM node:20-alpine AS runner
WORKDIR /app

ARG APP
ENV APP_NAME=${APP}

COPY --from=deps /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY --chmod=644 package.json ./

COPY proto ./proto
RUN chmod -R a+rX ./proto

USER node

CMD ["sh", "-c", "MAIN=$(find /app/dist/apps/${APP_NAME} -name 'main.js' 2>/dev/null | head -1) && echo \"Starting: $MAIN\" && node \"$MAIN\""]
