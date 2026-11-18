# syntax=docker/dockerfile:1

# --- Install production dependencies only ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- Runtime image ---
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=5001
WORKDIR /app

# Code and dependencies stay owned by root; the app runs as the unprivileged `node` user.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
