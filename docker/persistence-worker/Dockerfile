FROM oven/bun:latest

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/persistence-worker ./apps/persistence-worker

RUN bun install

WORKDIR /app/packages/db
RUN bunx prisma generate

WORKDIR /app/apps/persistence-worker

CMD ["bun", "run", "index.ts"]


