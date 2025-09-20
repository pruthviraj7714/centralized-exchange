FROM oven/bun:latest

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/matching-engine ./apps/matching-engine

RUN bun install

WORKDIR /app/packages/db
RUN bunx prisma generate

EXPOSE 8080

WORKDIR /app/apps/matching-engine

CMD ["bun", "run", "index.ts"]


