#!/bin/sh
set -eu

npm run prisma:migrate:deploy

if [ "${GEO_SEED_ON_START:-true}" = "true" ]; then
  npm run prisma:seed
fi

exec npm run start:prod
