FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node web/server.mjs ./web/server.mjs
USER node
EXPOSE 8080
CMD ["node", "web/server.mjs"]
