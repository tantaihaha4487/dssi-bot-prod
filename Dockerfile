# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY config.yaml ./config.yaml
COPY src ./src

# Create data dir and copy seed files from build context if the folder exists.
# Using a BuildKit bind mount avoids a hard COPY failure when data/ is absent.
RUN --mount=type=bind,source=.,target=/ctx \
    mkdir -p /app/data && \
    if [ -d /ctx/data ]; then \
        cp -rn /ctx/data/. /app/data/; \
    fi

CMD ["npm", "start"]
