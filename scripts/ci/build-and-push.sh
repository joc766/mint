#!/bin/bash
set -e

source .env

# Configuration
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-<your-username>}"
VERSION="${VERSION:-latest}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"

echo "Building and pushing Docker images..."
echo "Username: $DOCKERHUB_USERNAME"
echo "Version: $VERSION"

# Build and push database
echo "Building database image..."
docker build -t $DOCKERHUB_USERNAME/mint-db:$VERSION ./db
docker push $DOCKERHUB_USERNAME/mint-db:$VERSION

# Build and push API
echo "Building API image..."
docker build -t $DOCKERHUB_USERNAME/mint-api:$VERSION ./api
docker push $DOCKERHUB_USERNAME/mint-api:$VERSION

# Build and push frontend
echo "Building frontend image (production mode)..."
docker build \
  --target production \
  --build-arg BUILD_MODE=production \
  --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  -t $DOCKERHUB_USERNAME/mint-ui:$VERSION \
  ./frontend
docker push $DOCKERHUB_USERNAME/mint-ui:$VERSION

echo "All images built and pushed successfully!"
echo "Images:"
echo "  - $DOCKERHUB_USERNAME/mint-db:$VERSION"
echo "  - $DOCKERHUB_USERNAME/mint-api:$VERSION"
echo "  - $DOCKERHUB_USERNAME/mint-ui:$VERSION"
