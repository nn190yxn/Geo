FROM node:22.22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:3001/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_APP_VERSION=0.1.0
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run prisma:generate
RUN npm run build

FROM build AS api-test

ENV NODE_ENV=production
WORKDIR /app/apps/api

EXPOSE 3001

CMD ["sh", "/app/deploy/api-entrypoint.sh"]

FROM build AS web-test

ENV NODE_ENV=production
WORKDIR /app

EXPOSE 4173

CMD ["npm", "run", "preview", "--workspace", "@geo-platform/web"]
