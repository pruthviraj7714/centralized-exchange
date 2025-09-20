FROM node:18-alpine

WORKDIR /app

COPY ./turbo.json ./turbo.json
COPY ./bun.lock ./bun.lock
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json

COPY ./packages ./packages
COPY ./apps/frontend ./apps/frontend

RUN npm install

EXPOSE 3000

WORKDIR /app/apps/frontend

RUN npm run build

CMD ["npm", "run", "start"]


