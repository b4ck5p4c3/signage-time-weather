# Build
FROM oven/bun:1 AS deps
WORKDIR /usr/src/app
ENV NODE_ENV=production

## Install deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .

# Checks
FROM deps AS checks
RUN bun install --frozen-lockfile && bun test && bun typecheck

# Release
FROM deps AS release
CMD ["bun", "start"]