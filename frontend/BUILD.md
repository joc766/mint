# Frontend Build Guide

This guide explains how to build and run the frontend in both development and production modes.

## Quick Start

### Development Mode (Default)
```bash
# Using docker-compose (recommended)
docker-compose up frontend

# Or using profiles explicitly
docker-compose --profile dev up frontend

# Or build and run manually
docker build --target development -t frontend-dev ./frontend
docker run -p 3000:3000 -v $(pwd)/frontend:/app frontend-dev
```

### Production Mode
```bash
# Build and run all services in production (db, api, frontend)
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# Or build and run only frontend in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend

# Or build manually
docker build --target runner --build-arg BUILD_MODE=production -t frontend-prod ./frontend
docker run -p 3000:3000 -e NODE_ENV=production frontend-prod
```

## Build Modes Explained

### Development Mode
- **Hot reload enabled** - Changes to code are reflected immediately
- **Source code mounted** - Your local files are synced with the container
- **Larger image** - Includes all dev dependencies
- **Fast startup** - No build step required
- **Best for**: Local development and debugging

**Features:**
- File watching and hot module replacement
- Detailed error messages and stack traces
- Source maps for debugging
- Fast refresh for React components

### Production Mode
- **Optimized build** - Code is minified and optimized
- **Standalone output** - Minimal runtime with only necessary files
- **Smaller image** - Only production dependencies included
- **Better performance** - Optimized bundles and caching
- **Best for**: Staging, production deployments, and performance testing

**Features:**
- Code splitting and tree shaking
- Image optimization (if enabled)
- Gzip compression
- Production-ready error handling
- Security headers

## Docker Compose Usage

### Development (Default)
```bash
docker-compose up frontend
```

### Production
```bash
# Start all services (db, api, frontend) in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# Or start only frontend in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend
```

The same `docker-compose.yml` file handles both modes - just set `BUILD_MODE=production` for production builds. When you run `docker-compose up` without specifying a service, it starts all services (db, api, frontend).

## Environment Variables

### Development
Set in `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=development
  - NEXT_PUBLIC_API_URL=http://api:8000
```

### Production
Set in `docker-compose.prod.yml` or via environment:
```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Or use a `.env` file:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up
```

## Local Overrides

Create `docker-compose.override.yml` (git ignored) for local customizations:

```yaml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    ports:
      - "3001:3000"  # Use different port locally
```

## Building for Production

### Option 1: Using Docker Compose (Recommended)
```bash
# Build and start all services in production (single command)
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# Or build and start only frontend
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend
```

### Option 2: Manual Docker Build
```bash
# Build production image
docker build \
  --target runner \
  --build-arg BUILD_MODE=production \
  -t frontend-prod \
  ./frontend

# Run production container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=http://api:8000 \
  --name frontend-prod \
  frontend-prod
```

### Option 3: Local Build (without Docker)
```bash
cd frontend
pnpm install
NODE_ENV=production pnpm build
pnpm start
```

## Testing Production Build Locally

1. **Build the production image:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend
   ```

2. **Run in production mode:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up frontend
   ```

3. **Access at:** http://localhost:3000

## Performance Optimizations

The production build includes:
- ✅ Code splitting and lazy loading
- ✅ Tree shaking (removes unused code)
- ✅ Minification
- ✅ Gzip compression
- ✅ Image optimization (if configured)
- ✅ Standalone output (smaller Docker image)
- ✅ Production React optimizations

## Troubleshooting

### Build fails in production
- Check that all environment variables are set
- Verify `next.config.mjs` settings
- Check Docker build logs: `docker-compose build frontend`

### Hot reload not working in development
- Ensure volumes are mounted correctly
- Check that `NODE_ENV=development` is set
- Verify file permissions

### Production build is large
- Ensure `.dockerignore` is properly configured
- Check that multi-stage build is working
- Verify standalone output is enabled

### API connection issues
- Check `NEXT_PUBLIC_API_URL` environment variable
- Verify network connectivity between containers
- Check CORS settings on API

## Best Practices

1. **Always test production builds locally** before deploying
2. **Use environment variables** for configuration, not hardcoded values
3. **Keep development and production configs separate**
4. **Use Docker Compose profiles** to manage different environments
5. **Monitor build sizes** and optimize dependencies
6. **Enable source maps in production** only if needed for debugging
7. **Use health checks** in production for container orchestration

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build production image
  run: |
    BUILD_MODE=production docker-compose build frontend
    docker tag expense-tracker-app frontend-prod:${{ github.sha }}

- name: Push to registry
  run: |
    docker push frontend-prod:${{ github.sha }}
```

### GitLab CI Example
```yaml
build:production:
  stage: build
  script:
    - BUILD_MODE=production docker-compose build frontend
    - docker tag expense-tracker-app $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```
