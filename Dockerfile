FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY config.yaml ./config.yaml
COPY src ./src
RUN mkdir -p /app/data

CMD ["npm", "start"]
