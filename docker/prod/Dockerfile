FROM node:21-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy application files
COPY . .

# Build the Next.js application
RUN pnpm run build

# Production stage
FROM node:21-alpine AS runner

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --prefer-offline

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
