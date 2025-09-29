#!/bin/bash

# Skedy AI Rollback Script
# Easily rollback to any previous version using Docker registry tags

set -e

REGISTRY="ghcr.io"
IMAGE_NAME="mesieou/skedy-ai"
FULL_IMAGE="$REGISTRY/$IMAGE_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Skedy AI Rollback Tool${NC}"
echo "=================================="

# Function to show available tags
show_available_tags() {
    echo -e "${YELLOW}📋 Available image tags:${NC}"
    echo ""

    # Show local images
    echo -e "${BLUE}Local images:${NC}"
    docker images $FULL_IMAGE --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -10

    echo ""
    echo -e "${YELLOW}💡 Tag format explanation:${NC}"
    echo "  • latest          - Most recent main branch"
    echo "  • YYYYMMDD-HHmmss - Timestamped releases"
    echo "  • main-<sha>      - Git commit based"
    echo ""
}

# Function to rollback to specific tag
rollback_to_tag() {
    local target_tag="$1"
    local target_image="$FULL_IMAGE:$target_tag"

    echo -e "${YELLOW}🎯 Rolling back to: $target_image${NC}"

    # Pull the target image if not available locally
    echo "📥 Pulling image (if needed)..."
    if ! docker pull "$target_image"; then
        echo -e "${RED}❌ Failed to pull image: $target_image${NC}"
        echo "Available tags might be different. Check GitHub Container Registry."
        exit 1
    fi

    # Create rollback docker-compose file
    echo "📝 Creating rollback configuration..."
    cat > docker-compose.rollback.yml << EOF
version: '3.8'

services:
  # Main Next.js Application
  skedy-app:
    image: $target_image
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - skedy-network

  # Availability Rollover Cron Job
  availability-cron:
    image: $target_image
    command: ["npx", "tsx", "scripts/availability-cron.ts"]
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - skedy-app
    networks:
      - skedy-network

networks:
  skedy-network:
    driver: bridge
EOF

    # Test the rollback on port 3001 first
    echo "🧪 Testing rollback on port 3001..."
    sed 's|"3000:3000"|"3001:3000"|g' docker-compose.rollback.yml > docker-compose.rollback-test.yml

    if ! docker-compose -f docker-compose.rollback-test.yml up -d; then
        echo -e "${RED}❌ Failed to start rollback test containers${NC}"
        docker-compose -f docker-compose.rollback-test.yml down || true
        rm -f docker-compose.rollback-test.yml docker-compose.rollback.yml
        exit 1
    fi

    # Wait and test
    echo "⏳ Waiting for rollback containers to be ready..."
    sleep 15

    # Health check
    MAX_RETRIES=5
    for attempt in $(seq 1 $MAX_RETRIES); do
        if curl -f http://localhost:3001/api/health --max-time 10; then
            echo -e "${GREEN}✅ Rollback health check passed${NC}"
            break
        elif [ $attempt -eq $MAX_RETRIES ]; then
            echo -e "${RED}❌ Rollback health check failed after $MAX_RETRIES attempts${NC}"
            docker-compose -f docker-compose.rollback-test.yml logs
            docker-compose -f docker-compose.rollback-test.yml down || true
            rm -f docker-compose.rollback-test.yml docker-compose.rollback.yml
            exit 1
        else
            echo "⚠️ Health check failed, retrying in 5s (attempt $attempt/$MAX_RETRIES)..."
            sleep 5
        fi
    done

    # Stop current production
    echo "⏹️ Stopping current production containers..."
    docker-compose -f docker-compose.registry.yml down || true
    docker-compose -f docker-compose.cron.yml down || true

    # Stop test containers
    docker-compose -f docker-compose.rollback-test.yml down

    # Start rollback in production
    echo "🚀 Starting rollback in production..."
    docker-compose -f docker-compose.rollback.yml up -d

    # Final verification
    sleep 10
    if curl -f http://localhost:3000/api/health --max-time 10; then
        echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
        echo -e "${GREEN}📦 Now running: $target_image${NC}"

        # Rename rollback file to current
        mv docker-compose.rollback.yml docker-compose.current.yml

        echo ""
        echo -e "${BLUE}📱 Application logs:${NC}"
        docker-compose -f docker-compose.current.yml logs --tail 5 skedy-app
        echo ""
        echo -e "${BLUE}⏰ Cron service logs:${NC}"
        docker-compose -f docker-compose.current.yml logs --tail 5 availability-cron
    else
        echo -e "${RED}❌ Rollback health check failed${NC}"
        docker-compose -f docker-compose.rollback.yml logs
        exit 1
    fi

    # Cleanup
    rm -f docker-compose.rollback-test.yml

    echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
}

# Main script logic
if [ $# -eq 0 ]; then
    show_available_tags
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <tag>              - Rollback to specific tag"
    echo "  $0 latest             - Rollback to latest"
    echo "  $0 20241201-143022    - Rollback to specific timestamp"
    echo "  $0 main-abc1234       - Rollback to specific commit"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 latest"
    echo "  $0 20241201-143022"
    echo ""
    exit 0
fi

TARGET_TAG="$1"

# Confirm rollback
echo -e "${YELLOW}⚠️ Are you sure you want to rollback to: $FULL_IMAGE:$TARGET_TAG?${NC}"
echo "This will replace the currently running application."
read -p "Type 'yes' to continue: " -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    rollback_to_tag "$TARGET_TAG"
else
    echo -e "${BLUE}Rollback cancelled.${NC}"
    exit 0
fi
