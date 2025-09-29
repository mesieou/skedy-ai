#!/bin/bash

# Docker Cleanup Script for Kamatera Server
# This script helps free up disk space by removing unused Docker resources

set -e

echo "🧹 Starting Docker cleanup process..."

# Function to display disk usage
show_disk_usage() {
    echo "📊 Current disk usage:"
    df -h / | grep -E '^/dev/'
    echo ""
}

# Function to display Docker disk usage
show_docker_usage() {
    echo "🐳 Docker disk usage:"
    docker system df
    echo ""
}

# Show initial state
echo "=== BEFORE CLEANUP ==="
show_disk_usage
show_docker_usage

# 1. Remove stopped containers
echo "🗑️  Removing stopped containers..."
docker container prune -f

# 2. Remove unused networks
echo "🌐 Removing unused networks..."
docker network prune -f

# 3. Remove unused volumes (be careful with this)
echo "💾 Removing unused volumes..."
docker volume prune -f

# 4. Remove dangling images (untagged images)
echo "🖼️  Removing dangling images..."
docker image prune -f

# 5. Remove unused images (not just dangling)
echo "🖼️  Removing unused images..."
docker image prune -a -f

# 6. Remove build cache
echo "🏗️  Removing build cache..."
docker builder prune -f

# 7. Clean up old skedy-ai images (keep only latest and last 2 timestamped versions)
echo "🏷️  Cleaning up old skedy-ai images..."
# Get all skedy-ai images with timestamp tags, sort by tag (newest first), skip first 2, remove the rest
docker images skedy-ai --format "table {{.Tag}}" | grep -E '^[0-9]{12,14}$' | sort -r | tail -n +3 | xargs -r -I {} docker rmi "skedy-ai:{}" 2>/dev/null || true

# 8. System-wide cleanup
echo "🧽 Running system-wide Docker cleanup..."
docker system prune -a -f --volumes

# Show final state
echo ""
echo "=== AFTER CLEANUP ==="
show_disk_usage
show_docker_usage

echo "✅ Docker cleanup completed!"

# Additional system cleanup suggestions
echo ""
echo "💡 Additional cleanup suggestions:"
echo "   - Clear apt cache: sudo apt clean"
echo "   - Remove old logs: sudo journalctl --vacuum-time=7d"
echo "   - Clear npm cache: npm cache clean --force"
echo "   - Remove old kernels: sudo apt autoremove"
