FROM oven/bun:latest

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/server ./apps/server

RUN bun install

WORKDIR /app/packages/db
RUN bunx prisma generate

EXPOSE 3001

WORKDIR /app/apps/server

CMD ["bun", "run", "index.ts"]


