# Quick Start Guide - Development vs Production

## Development Mode (with hot reload)

**Start development server:**
```bash
# Full command
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use convenience script
./scripts/dev.sh

# Frontend only
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend
```

**Features:**
- Hot reload enabled
- Source code mounted for live editing
- Fast startup
- Detailed error messages

## Production Mode

**Build and start production server:**
```bash
# Full command
BUILD_MODE=production docker-compose up --build

# Or use convenience script
./scripts/prod.sh

# Frontend only
BUILD_MODE=production docker-compose up --build frontend
```

**Features:**
- Optimized and minified code
- Smaller Docker image
- Better performance
- Production-ready configuration

## Quick Commands

### Development
```bash
# Start all services (dev mode with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use convenience script
./scripts/dev.sh

# Start only frontend (dev mode)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend

# Rebuild and start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build frontend
```

### Production
```bash
# Build and start all services in production (db, api, frontend)
BUILD_MODE=production docker-compose up --build

# Or use convenience script
./scripts/prod.sh

# Start only frontend in production
BUILD_MODE=production docker-compose up --build frontend

# For production deployment with auto-restart (detached)
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# View logs (all services or specific service)
docker-compose logs -f
docker-compose logs -f frontend

# Stop all services
docker-compose down
```

### Testing Production Locally
```bash
# Build and run production build locally (foreground mode)
BUILD_MODE=production docker-compose up frontend
```

## Environment Variables

Set `NEXT_PUBLIC_API_URL` for API connection:

**Development:**
```bash
# In docker-compose.yml or .env file
NEXT_PUBLIC_API_URL=http://api:8000
```

**Production:**
```bash
# In docker-compose.prod.yml or environment
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Switching Between Modes

1. **Stop current containers:**
   ```bash
   docker-compose down
   ```

2. **Start in desired mode:**
   ```bash
   # Development (all services)
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   # Or: ./scripts/dev.sh
   
   # Development (frontend only)
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend
   
   # Production (all services)
   BUILD_MODE=production docker-compose up --build
   # Or: ./scripts/prod.sh
   
   # Production (frontend only)
   BUILD_MODE=production docker-compose up --build frontend
   ```

## Troubleshooting

**Port already in use:**
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

**Build cache issues:**
```bash
# Rebuild without cache
docker-compose build --no-cache frontend
```

**View container logs:**
```bash
docker-compose logs -f frontend
```

For more details, see `frontend/BUILD.md`
