FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NEXT_PUBLIC_API_PROXY_PATH=/backend
ENV NEXT_PUBLIC_SOCKET_PATH=/backend/socket.io

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

RUN npm run db:generate
RUN npm run build --workspace=@cashflow/shared
RUN npm run build --workspace=@cashflow/database
RUN npm run build --workspace=@cashflow/api
RUN npm run build --workspace=@cashflow/web

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV AUTH_TRUST_HOST=true
ENV PORT=3000
ENV API_HOST=127.0.0.1
ENV API_PORT=4000
ENV WEB_HOST=127.0.0.1
ENV WEB_PORT=3001
ENV API_URL=http://127.0.0.1:4000
ENV API_PROXY_PATH=/backend
ENV NEXT_PUBLIC_API_PROXY_PATH=/backend
ENV NEXT_PUBLIC_SOCKET_PATH=/backend/socket.io
ENV DATABASE_AUTO_SETUP=true

COPY --from=builder /app ./

EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]
