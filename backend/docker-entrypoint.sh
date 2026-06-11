#!/bin/sh
set -e

mkdir -p /app/data

if [ ! -f /app/data/dev.db ]; then
  echo ">>> First run: creating database tables..."
  npx prisma db push --skip-generate
  echo ">>> Seeding database..."
  node prisma/seed.js
  echo ">>> Database ready."
else
  echo ">>> Database already exists, skipping init."
fi

echo ">>> Starting server..."
exec node src/index.js
