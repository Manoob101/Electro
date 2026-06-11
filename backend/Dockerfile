FROM node:20

WORKDIR /app

COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --production --legacy-peer-deps

COPY . .

RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

EXPOSE 5000

CMD ["node", "src/index.js"]
