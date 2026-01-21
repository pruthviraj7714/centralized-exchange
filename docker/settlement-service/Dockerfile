FROM oven/bun:latest

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/settlement-service ./apps/settlement-service

RUN bun install

WORKDIR /app/packages/db
RUN bunx prisma generate

WORKDIR /app/apps/settlement-service

CMD ["bun", "run", "index.ts"]


