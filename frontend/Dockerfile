# Multi-stage Dockerfile for Next.js
# Supports both development and production (static export) builds

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
# Builder stage (for production static export)
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build argument for API URL (must be available at build time for NEXT_PUBLIC_* vars)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set NEXT_PUBLIC_API_URL as environment variable during build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the application - creates static export in /app/out
RUN pnpm build

# ============================================
# Production runner stage - Nginx static server
# ============================================
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static files
RUN rm -rf ./*

# Copy static files from builder
COPY --from=builder /app/out ./

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx listens on port 80 (standard)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

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

EXPOSE 3000

ENV NODE_ENV=development
# Enable file watching in Docker environment
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Use --turbo for faster dev server with better file watching
CMD ["pnpm", "dev"]
