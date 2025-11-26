# Multi-stage Dockerfile for Next.js
# Supports both development and production builds

# ============================================
# Dependencies stage
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Builder stage (for production builds)
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build argument to control build mode
ARG BUILD_MODE=production
# Build argument for API URL (must be available at build time for NEXT_PUBLIC_* vars)
ARG NEXT_PUBLIC_API_URL=http://api:8000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set NEXT_PUBLIC_API_URL as environment variable during build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the application
RUN if [ "$BUILD_MODE" = "production" ]; then \
      pnpm build; \
    fi

# ============================================
# Production runner stage
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Copy the standalone output (includes server.js and all dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder (standalone output may not include it)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Alias for production (allows BUILD_MODE=production to work)
# This is just an alias - Docker will use the runner stage
FROM runner AS production

# ============================================
# Development stage
# ============================================
FROM node:20-alpine AS development
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Note: We intentionally don't copy source files here in dev mode
# They will be mounted via volumes for hot reload
# We only create empty directories for build artifacts

EXPOSE 3000

ENV NODE_ENV=development
# Enable file watching in Docker environment
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Use --turbo for faster dev server with better file watching
CMD ["pnpm", "dev"]
