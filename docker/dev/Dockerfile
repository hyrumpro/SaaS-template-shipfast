FROM node:21-alpine

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy the rest of the application
COPY . .

EXPOSE 3000

# Note: Database migrations should be run after environment variables are available
# They will be run via docker-compose command or manually
CMD ["pnpm", "run", "dev"]
