# CI/CD Testing Documentation

## Overview

This repository uses GitHub Actions to automatically test both development and production build modes before merging to main.

## Workflows

### test-dev-branch.yml

Main CI workflow that runs on:
- Push to `dev` branch
- Push to any `refactor/**` or `feature/**` branches
- Pull requests to `main` or `dev`

**Tests performed**:
1. **Development Mode Tests**
   - Builds and starts all services (db, api, frontend) in development mode
   - Verifies database is healthy using `pg_isready`
   - Verifies API is responsive on localhost:8000 (root endpoint only)
   - Verifies frontend is accessible on localhost:3000 (root page only)
   - Tests return valid HTML/JSON responses

2. **Production Mode Tests**
   - Builds and starts all services in production mode
   - Uses `BUILD_MODE=production` environment variable
   - Verifies optimized frontend build
   - Verifies API remains functional in production mode
   - Validates `NODE_ENV=production` is set correctly

## Running Tests Locally

### Test Development Mode
```bash
# Set environment variables
export SECRET_KEY=test-secret-key
export PLAID_CLIENT_ID=test-client-id
export PLAID_SECRET=test-secret
export PLAID_ENV=sandbox

# Start services
docker-compose up --build

# In another terminal, run health checks
./scripts/ci/wait-for-services.sh
./scripts/ci/test-api-health.sh
./scripts/ci/test-frontend-health.sh
```

### Test Production Mode
```bash
# Set environment variables
export SECRET_KEY=test-secret-key
export PLAID_CLIENT_ID=test-client-id
export PLAID_SECRET=test-secret
export PLAID_ENV=sandbox
export BUILD_MODE=production

# Start services
BUILD_MODE=production docker-compose up --build

# In another terminal, run health checks
./scripts/ci/wait-for-services.sh
./scripts/ci/test-api-health.sh
BUILD_MODE=production ./scripts/ci/test-frontend-health.sh
```

### Troubleshooting with Scripts

All scripts in `scripts/ci/` can be used for local troubleshooting:

```bash
# Wait for all services to be ready
./scripts/ci/wait-for-services.sh

# Test just the API
./scripts/ci/test-api-health.sh

# Test just the frontend (development)
./scripts/ci/test-frontend-health.sh

# Test just the frontend (production)
BUILD_MODE=production ./scripts/ci/test-frontend-health.sh
```

## Workflow Status

Check workflow status in the [Actions tab](../../actions) of the repository.

## What Gets Tested

### API Testing
- ✓ Root endpoint (`/`) returns expected message
- ✓ API responds with HTTP 200 status
- ✓ Database connection is healthy
- ✗ **Not tested**: Authentication endpoints (will be added later)
- ✗ **Not tested**: Protected endpoints (will be added later)

### Frontend Testing
- ✓ Root page (`/`) returns valid HTML
- ✓ Frontend responds with HTTP 200 status
- ✓ Production build sets `NODE_ENV=production`
- ✗ **Not tested**: Individual page routes (will be added later)
- ✗ **Not tested**: User interactions (will be added later)

## Troubleshooting

### Workflow fails on database connection
- Check database healthcheck configuration in `docker-compose.yml`
- Verify DATABASE_URL environment variable is correct
- Increase timeout in wait-for-services steps

### Frontend fails to start in production mode
- Verify Dockerfile multi-stage builds work correctly
- Check that `output: 'standalone'` is set in `next.config.mjs`
- Ensure all dependencies are in `package.json` (not just devDependencies)
- Check frontend logs: `docker-compose logs frontend`

### API tests fail
- Check API logs: `docker-compose logs api`
- Verify environment variables are set correctly
- Check database migrations ran successfully
- Ensure PostgreSQL is healthy: `docker-compose exec db pg_isready -U plaid_user -d plaid_db`

### Services timeout waiting for health check
- Increase timeout values in workflow
- Check if services are failing to start: `docker-compose ps`
- Review logs for all services: `docker-compose logs`

## CI Environment Details

### Environment Variables
The CI workflow uses test credentials:
- `SECRET_KEY=test-secret-key-for-ci`
- `PLAID_CLIENT_ID=test-client-id`
- `PLAID_SECRET=test-secret`
- `PLAID_ENV=sandbox`

These are safe for CI testing only and should not be used in production.

### Timeouts
- Database health check: 120 seconds
- API health check: 120 seconds
- Frontend health check (dev): 180 seconds
- Frontend health check (prod): 300 seconds
- Overall job timeout: 20 minutes

## Future Enhancements

When ready to add more comprehensive testing:

### API Endpoint Testing
- Add user creation and authentication tests
- Test protected endpoints with JWT tokens
- Test CRUD operations for categories, transactions, etc.

### Frontend Page Testing
- Add tests for specific routes (/login, /dashboard, etc.)
- Add E2E tests with Playwright or Cypress
- Test user interactions and form submissions

### Performance Testing
- Measure API response times
- Measure frontend page load times
- Compare dev vs production performance

### Security Testing
- Add vulnerability scanning with Trivy
- Test CORS configuration
- Validate security headers

## Security Notes

- Never commit real API keys or secrets
- Use GitHub Secrets for sensitive values in production
- Test secrets are safe for CI environment only
- All containers are cleaned up after tests with `docker-compose down -v`
