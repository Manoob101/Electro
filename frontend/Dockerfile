FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
