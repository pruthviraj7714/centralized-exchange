FROM oven/bun:latest

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/dlq-worker ./apps/dlq-worker

RUN bun install

WORKDIR /app/packages/db
RUN bunx prisma generate

WORKDIR /app/apps/dlq-worker

CMD ["bun", "run", "index.ts"]


