# ============================
# Stage 1: Dependencies (All)
# ============================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install all dependencies (including dev dependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# ============================
# Stage 2: Production Dependencies Only
# ============================
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ============================
# Stage 3: Builder
# ============================
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build arguments for client-side environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy the app source
COPY . .

# Build-time envs
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set client-side environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Build Next.js
RUN npm run build

# ============================
# Stage 4: Runner
# ============================
FROM node:20-alpine AS runner
WORKDIR /app

# Add curl for healthcheck
RUN apk add --no-cache curl

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

# Copy scripts directly from source (not from builder)
COPY scripts ./scripts

# Copy production-only node_modules for runtime dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose app port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start app (use standalone entrypoint)
CMD ["npm", "start"]
