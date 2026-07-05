# TanStack Start SSR → Node server. The Lovable vite config defaults to a Cloudflare target, so we
# override the Nitro preset to node-server (produces .output/server/index.mjs runnable by node).
# VITE_API_BASE_URL is baked into the client bundle at build time — pass it as a build arg.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    NITRO_PRESET=node-server \
    SERVER_PRESET=node-server
RUN bun run build

# Small runtime: only the built .output + node.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
