# Quick Start Guide - Development vs Production

## Development Mode (Default)

**Start development server:**
```bash
docker-compose up frontend
```

**Features:**
- Hot reload enabled
- Source code mounted for live editing
- Fast startup
- Detailed error messages

## Production Mode

**Build and start production server:**
```bash
# Build production image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend

# Start production container
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d frontend
```

**Features:**
- Optimized and minified code
- Smaller Docker image
- Better performance
- Production-ready configuration

## Quick Commands

### Development
```bash
# Start all services (dev mode)
docker-compose up

# Start only frontend (dev mode)
docker-compose up frontend

# Rebuild and start
docker-compose up --build frontend
```

### Production
```bash
# Build and start all services in production (db, api, frontend)
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# Or start only frontend in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend

# View logs (all services or specific service)
docker-compose logs -f
docker-compose logs -f frontend

# Stop all services
docker-compose down
```

### Testing Production Locally
```bash
# Build and run production build locally
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
   docker-compose up
   
   # Development (frontend only)
   docker-compose up frontend
   
   # Production (all services)
   BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build
   
   # Production (frontend only)
   BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend
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
