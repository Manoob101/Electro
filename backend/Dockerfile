FROM node:20

WORKDIR /app

COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --legacy-peer-deps

COPY . .

RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

CMD ["./docker-entrypoint.sh"]
