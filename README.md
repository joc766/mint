# Plaid Transaction Categorization API

A comprehensive API for managing financial transactions from Plaid with advanced categorization capabilities.

## Features

- **Plaid Integration**: Sync accounts and transactions from financial institutions
- **Custom Categorization**: Create and manage custom categories and subcategories
- **Transaction Management**: View, filter, and update transactions
- **Transaction Splitting**: Split transactions across multiple categories
- **Recurring Transaction Detection**: Identify and track recurring transactions
- **Analytics**: Spending analysis by category and time period
- **User Authentication**: Secure JWT-based authentication

## Database Schema

The API uses a PostgreSQL database with the following main entities:

- **Users**: User accounts and authentication
- **Plaid Items**: Financial institution connections
- **Accounts**: Individual bank accounts from Plaid
- **Transactions**: Transaction data with categorization
- **Categories**: Custom and system-defined categories
- **Transaction Splits**: For splitting transactions across categories
- **Recurring Transactions**: Recurring transaction patterns

## Setup

### Quick Start with Docker Compose (Recommended)

The easiest way to get started is using Docker Compose, which sets up all services (database, API, and frontend) together:

1. **Set up environment variables:**
   ```bash
   # Create a .env file in the project root
   export PLAID_CLIENT_ID=your_plaid_client_id
   export PLAID_SECRET=your_plaid_secret
   export PLAID_ENV=sandbox  # or 'development' or 'production'
   ```

2. **Start all services:**
   ```bash
   # Start database, API, and frontend (development mode)
   docker-compose up
   
   # Or start in detached mode
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Database Setup**:
   - Create a PostgreSQL database
    - Ex. with docker: 
    ```bash
    docker run --name plaid_api_db \
      -e POSTGRES_DB=plaid_db \
      -e POSTGRES_USER=plaid_user \
      -e POSTGRES_PASSWORD=plaid_password \
      -p 5432:5432 \
      -d postgres:15-alpine
    ```
   - Run the schema: `psql -d your_database -f database_schema.sql`

3. **Environment Configuration**:
   - Copy `.env.example` to `.env`
   - Fill in your database URL, JWT secret, and Plaid credentials

4. **Run the API**:
   - Build the docker image based on `Dockerfile`: `docker build -t plaid-api .`
   
   - Run the container with: 
   ```sh
   docker run -d \
  --name plaid_api_app \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://plaid_user:plaid_password@host.docker.internal:5432/plaid_db \
  -e SECRET_KEY=your-super-secret-jwt-key-change-in-production \
  -e PLAID_CLIENT_ID=${PLAID_CLIENT_ID} \
  -e PLAID_SECRET=${PLAID_SECRET} \
  -e PLAID_ENV=${PLAID_ENV:-sandbox} \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  plaid-api
  ```

## API Endpoints

### Authentication
- `POST /users/` - Create user account
- `POST /auth/login` - Login and get access token

### Plaid Integration
- `POST /plaid/items/` - Add Plaid item (financial institution)
- `GET /plaid/items/` - Get user's Plaid items
- `POST /plaid/sync/` - Sync accounts and transactions

### Transactions
- `GET /transactions/` - Get transactions with filtering
- `PUT /transactions/{id}` - Update transaction categorization

### Categories
- `GET /categories/` - Get all categories
- `POST /categories/` - Create custom category
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category

### Analytics
- `GET /analytics/spending-by-category` - Spending breakdown by category

## Usage Examples

### 1. Create User and Login
```bash
curl -X POST "http://localhost:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "first_name": "John", "last_name": "Doe"}'

curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=user@example.com&password=password123"
```

### 2. Add Plaid Item
```bash
curl -X POST "http://localhost:8000/plaid/items/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "plaid_item_id",
    "access_token": "access_token",
    "institution_id": "institution_id",
    "institution_name": "Chase Bank",
    "available_products": ["transactions"],
    "billed_products": ["transactions"]
  }'
```

### 3. Sync Transactions
```bash
curl -X POST "http://localhost:8000/plaid/sync/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_id": "plaid_item_id"}'
```

### 4. Categorize Transaction
```bash
curl -X PUT "http://localhost:8000/transactions/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_category_id": 1,
    "custom_subcategory_id": 2,
    "notes": "Grocery shopping",
    "tags": ["weekly", "essential"]
  }'
```

### 5. Create Custom Category
```bash
curl -X POST "http://localhost:8000/categories/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hobbies",
    "description": "Hobby-related expenses",
    "color": "#FF6B6B",
    "icon": "hobby"
  }'
```

## Database Schema Details

The database includes comprehensive tables for:

- **User Management**: Secure authentication and user profiles
- **Plaid Integration**: Full support for Plaid API data structures
- **Transaction Categorization**: Both Plaid categories and custom categories
- **Transaction Splitting**: Support for complex transaction categorization
- **Recurring Transactions**: Pattern detection and management
- **Analytics**: Optimized for reporting and analysis

## Security Considerations

- All access tokens should be encrypted in production
- Use environment variables for sensitive configuration
- Implement proper CORS policies
- Use HTTPS in production
- Regularly rotate JWT secrets

## Development

The API is built with:
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Plaid Python SDK**: Official Plaid integration
- **PostgreSQL**: Robust relational database
- **JWT**: Secure authentication

## Frontend Application

The project includes a Next.js frontend application for interacting with the API.

### Quick Start

**Development Mode (Default):**
```bash
# Start all services including frontend in development mode
docker-compose up

# Or start only the frontend
docker-compose up frontend
```

**Production Mode:**
```bash
# Build and start all services (db, api, frontend) in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build

# Or start only the frontend in production
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build frontend
```

### Development vs Production Builds

The frontend supports two build modes:

#### Development Mode
- **Hot reload enabled** - Changes reflect immediately
- **Source code mounted** - Edit files locally and see changes
- **Fast startup** - No build step required
- **Best for**: Local development and debugging

**Start development:**
```bash
docker-compose up frontend
```

#### Production Mode
- **Optimized build** - Code is minified and optimized
- **Smaller Docker image** - Only production dependencies
- **Better performance** - Optimized bundles and caching
- **Best for**: Staging, production deployments, and performance testing

**Build and start production:**
```bash
# Build and start all services in production (single command)
BUILD_MODE=production RESTART_POLICY=unless-stopped docker-compose up -d --build
```

### Environment Variables

Set `NEXT_PUBLIC_API_URL` to configure the API endpoint:

**Development:**
```bash
# In docker-compose.yml
NEXT_PUBLIC_API_URL=http://api:8000
```

**Production:**
```bash
# In docker-compose.prod.yml or environment
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Testing Production Build Locally

To test the production build before deploying:

```bash
BUILD_MODE=production docker-compose up frontend
```

Access at: http://localhost:3000

### Build Configuration

The frontend uses:
- **Next.js 14** - React framework with SSR/SSG
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Docker multi-stage builds** - Optimized production images

**Key files:**
- `frontend/Dockerfile` - Multi-stage Dockerfile (dev & prod targets)
- `frontend/next.config.mjs` - Next.js configuration with production optimizations
- `docker-compose.yml` - Unified configuration (supports both dev and prod via BUILD_MODE)

For detailed build documentation, see:
- `frontend/BUILD.md` - Comprehensive build guide
- `QUICK_START.md` - Quick reference commands

## Next Steps

1. Set up your Plaid account and get API credentials
2. Configure your database and environment variables
3. Run the API and start syncing your financial data
4. Use the categorization features to organize your transactions
5. Start the frontend application to interact with the API
6. Build and test production builds before deploying