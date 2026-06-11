FROM node:20

WORKDIR /app

COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --legacy-peer-deps

COPY . .

RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "mkdir -p /app/data && npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
