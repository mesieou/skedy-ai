#!/bin/bash
# Environment Verification Script
# Compares local development environment with Docker container

echo "🔍 Environment Verification Report"
echo "=================================="

echo ""
echo "📋 NODE.JS VERSIONS:"
echo "Local:     $(node --version)"
echo "Container: $(docker exec skedy-test node --version 2>/dev/null || echo 'Container not running')"

echo ""
echo "📋 NPM VERSIONS:"
echo "Local:     $(npm --version)"
echo "Container: $(docker exec skedy-test npm --version 2>/dev/null || echo 'Container not running')"

echo ""
echo "📋 CRITICAL DEPENDENCIES:"
echo "Local WebSocket:"
npm list ws --depth=0 2>/dev/null | grep ws || echo "ws not found locally"

echo "Container WebSocket:"
docker exec skedy-test npm list ws --depth=0 2>/dev/null | grep ws || echo "ws not found in container"

echo ""
echo "Local OpenAI:"
npm list openai --depth=0 2>/dev/null | grep openai || echo "openai not found locally"

echo "Container OpenAI:"
docker exec skedy-test npm list openai --depth=0 2>/dev/null | grep openai || echo "openai not found in container"

echo ""
echo "📋 PACKAGE.JSON INTEGRITY:"
LOCAL_DEPS=$(cat package.json | jq -r '.dependencies | keys[]' | wc -l)
echo "Local dependencies count: $LOCAL_DEPS"

if docker exec skedy-test test -f /app/package.json 2>/dev/null; then
    CONTAINER_DEPS=$(docker exec skedy-test cat /app/package.json | jq -r '.dependencies | keys[]' | wc -l)
    echo "Container dependencies count: $CONTAINER_DEPS"

    if [ "$LOCAL_DEPS" -eq "$CONTAINER_DEPS" ]; then
        echo "✅ Dependency counts match"
    else
        echo "❌ Dependency counts differ"
    fi
else
    echo "❌ Container package.json not accessible"
fi

echo ""
echo "📋 ENVIRONMENT VARIABLES:"
echo "Local NODE_ENV: ${NODE_ENV:-'not set'}"
echo "Container NODE_ENV: $(docker exec skedy-test printenv NODE_ENV 2>/dev/null || echo 'not set')"

echo ""
echo "🎯 RECOMMENDATIONS:"
if docker exec skedy-test test -f /app/node_modules/ws/package.json 2>/dev/null; then
    echo "✅ WebSocket library properly installed in container"
else
    echo "❌ WebSocket library missing in container - rebuild needed"
fi

echo ""
echo "=================================="
echo "Verification complete!"
