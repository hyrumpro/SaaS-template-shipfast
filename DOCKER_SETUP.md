# Docker Setup Guide

This guide explains how to run ShipFree using Docker for both development and production environments.

---

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (included with Docker Desktop)
- Git (to clone the repository)

---

## Quick Start

### 1. Development (without PostgreSQL)

```bash
# 1. Copy environment file
cp .env.docker.example .env.docker

# 2. Edit .env.docker with your actual API keys
# Required: Supabase, Stripe/LemonSqueezy, Mailgun

# 3. Start the application
cd docker/dev
docker-compose up --build

# Application available at: http://localhost:3000
# Portainer dashboard at: http://localhost:9000
```

### 2. Development (with PostgreSQL)

```bash
# 1. Copy environment file
cp .env.docker.example .env.docker

# 2. Edit .env.docker with your API keys

# 3. Start with PostgreSQL
cd docker/dev
docker-compose -f docker-compose.postgres.yml up --build

# Application: http://localhost:3000
# Portainer: http://localhost:9000
# pgAdmin: http://localhost:5050 (admin@example.com / admin)
# PostgreSQL: localhost:5432 (devuser / devpass / shipfreedev)
```

---

## Production Deployment

### 1. Using Pre-built Image (Recommended)

```bash
# 1. Copy production environment file
cp .env.production.example .env.production

# 2. Edit .env.production with PRODUCTION keys
# ⚠️  Use production API keys, not test keys!

# 3. Deploy
cd docker/prod
docker-compose up -d

# With PostgreSQL
docker-compose -f docker-compose.postgres.yml up -d
```

### 2. Building Your Own Image

```bash
# 1. Set up production environment
cp .env.production.example .env.production
# Edit .env.production

# 2. Build the image
cd ../..  # Go to project root
docker build -f docker/prod/Dockerfile -t your-registry/shipfree:latest .

# 3. Push to your registry
docker push your-registry/shipfree:latest

# 4. Update docker-compose.yml with your image
# Change: ghcr.io/idee8/shipfree:latest
# To: your-registry/shipfree:latest

# 5. Deploy
cd docker/prod
docker-compose up -d
```

---

## Environment Variables

### Development (.env.docker)
- Used for local development
- Can use test/sandbox API keys
- Database defaults to Docker PostgreSQL (if using postgres compose file)

### Production (.env.production)
- Used for production deployment
- **MUST use production API keys**
- Should use external managed database (Supabase, AWS RDS, etc.)

### Required Variables

**All Environments:**
```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Payment Processing:**
```
# Stripe (if using Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# LemonSqueezy (if using LemonSqueezy)
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_STORE_ID
LEMONSQUEEZY_WEBHOOK_SECRET
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID
```

**Email Sending:**
```
MAILGUN_API_KEY
MAILGUN_DOMAIN
MAILGUN_FROM_EMAIL
MAILGUN_SIGNING_KEY
```

**Database:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## Available Docker Compose Files

### Development

1. **`docker-compose.yml`**
   - App only (no database)
   - Use external database (Supabase)
   - Fastest startup

2. **`docker-compose.postgres.yml`**
   - App + PostgreSQL + pgAdmin
   - Complete local development environment
   - Includes database management UI

3. **`docker-compose.mongodb.yml`**
   - App + MongoDB (if needed)
   - Alternative database option

### Production

1. **`docker-compose.yml`**
   - App only
   - Use external managed database (recommended)
   - Minimal footprint

2. **`docker-compose.postgres.yml`**
   - App + PostgreSQL
   - Self-hosted database
   - Not recommended for production (use managed DB instead)

3. **`docker-compose.mongodb.yml`**
   - App + MongoDB (if needed)

---

## Docker Commands

### Start Services
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached)
docker-compose up -d

# Rebuild and start
docker-compose up --build
```

### Stop Services
```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️  deletes database data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Execute Commands in Container
```bash
# Open shell in app container
docker-compose exec app sh

# Run database migrations
docker-compose exec app pnpm drizzle-kit push

# Run any command
docker-compose exec app pnpm <command>
```

### Database Management
```bash
# Backup database (PostgreSQL)
docker-compose exec postgres pg_dump -U devuser shipfreedev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U devuser shipfreedev < backup.sql

# Access PostgreSQL shell
docker-compose exec postgres psql -U devuser -d shipfreedev
```

---

## Testing Your Docker Setup

### Quick Test Checklist

Before testing, ensure:
1. ✅ Docker Desktop is running (Windows: check system tray icon)
2. ✅ `.env.docker` file exists (copy from `.env.docker.example`)
3. ✅ Environment variables are filled in (at minimum, dummy values work for basic testing)

### What to Expect During Testing

**With Test/Dummy Values:**
- ✅ App builds successfully
- ✅ App starts on port 3000
- ✅ Pages render correctly
- ✅ Hot reload works
- ⚠️ Auth won't work (need real Supabase keys)
- ⚠️ Payments won't work (need real payment keys)
- ⚠️ Emails won't send (need real Mailgun keys)

**Expected Warnings (These are OK):**
```
⚠️ "LEMONSQUEEZY_API_KEY is not configured" - Normal with dummy values
⚠️ "Failed to connect to Supabase" - Normal with dummy values
⚠️ TypeScript errors ignored - Documented workaround in next.config.ts
⚠️ Linting warnings - Non-critical
```

### Success Criteria

Docker setup is working if:
1. ✅ Build completes without fatal errors (5-10 minutes first time)
2. ✅ Containers start successfully
3. ✅ App accessible at http://localhost:3000
4. ✅ Hot reload works (edit file → browser auto-refreshes)
5. ✅ No container crashes in logs

### Testing Hot Reload

With containers running:
```bash
# 1. Edit any file, e.g., src/app/page.tsx
# 2. Save the file
# 3. Check browser - should auto-refresh within seconds
```

---

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"
**Solution:**
- Start Docker Desktop application
- Wait for it to fully load (icon stops animating)
- Verify with: `docker ps`

### Issue: Build fails with "pnpm: not found"
**Solution:** The Dockerfile now uses corepack to enable pnpm. Ensure you're using the updated Dockerfile.

### Issue: "Cannot find module" errors
**Solution:** Node modules might not be installed properly.
```bash
docker-compose down -v
docker-compose up --build
```

### Issue: Build takes too long
**Solution:** First build takes 5-10 minutes (downloading dependencies). Subsequent builds use cached layers and are much faster.

### Issue: Database connection fails
**Solution:** Ensure DATABASE_URL is correct and PostgreSQL is running.
```bash
# Check PostgreSQL health
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Issue: Port already in use
**Solution:** Change port mapping in docker-compose.yml
```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Issue: Hot reload not working in development
**Solution:** Ensure volumes are properly mounted:
```yaml
volumes:
  - ../../:/app
  - /app/node_modules
  - /app/.next
```

### Issue: Environment variables not loaded
**Solution:**
1. Ensure .env.docker exists
2. Check env_file path in docker-compose.yml
3. Restart containers: `docker-compose down && docker-compose up`

### Issue: Build works locally but fails in Docker
**Solution:** Check .dockerignore file. Ensure necessary files aren't excluded.

---

## Services Overview

### Application (Port 3000)
- Next.js application
- Development: Hot reload enabled
- Production: Optimized build

### Portainer (Port 9000)
- Docker container management UI
- Access: http://localhost:9000
- Useful for monitoring containers

### PostgreSQL (Port 5432)
- PostgreSQL 15 Alpine
- Development credentials:
  - User: devuser
  - Password: devpass
  - Database: shipfreedev
- Production credentials:
  - User: produser
  - Password: prodpass
  - Database: shipfreeprod

### pgAdmin (Port 5050)
- PostgreSQL management UI
- Development only
- Default credentials:
  - Email: admin@example.com
  - Password: admin

---

## Volume Management

### Named Volumes
- `postgres_data` - PostgreSQL database files
- `portainer_data` - Portainer configuration

### Anonymous Volumes
- `/app/node_modules` - Node dependencies (not mounted from host)
- `/app/.next` - Next.js build cache (development only)

### Backup Volumes
```bash
# List volumes
docker volume ls

# Backup volume
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

---

## Performance Optimization

### Development
- Hot reload enabled via volume mounts
- Source code changes reflected immediately
- Database persisted in volume

### Production
- Multi-stage build for minimal image size
- Only production dependencies included
- Runs as non-root user for security
- Standalone Next.js output for optimal performance

---

## Security Best Practices

1. **Never commit .env files**
   - .env.docker
   - .env.production
   - These are in .gitignore

2. **Use secrets management in production**
   - Docker secrets
   - Environment variable injection from CI/CD
   - External secret managers (AWS Secrets Manager, etc.)

3. **Change default passwords**
   - PostgreSQL passwords
   - pgAdmin credentials

4. **Use non-root user** (Production Dockerfile already configured)

5. **Keep images updated**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

## Next Steps

1. ✅ Set up environment variables
2. ✅ Start Docker containers
3. ⚠️  Implement database schema (see PRODUCTION_READINESS.md)
4. ⚠️  Configure webhooks for Stripe/LemonSqueezy
5. ⚠️  Set up email sending with Mailgun
6. ⚠️  Run database migrations
7. ⚠️  Test payment flows

---

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Production Readiness Guide](../PRODUCTION_READINESS.md)
- [Payment Integration Guide](../PAYMENT_INTEGRATION_GUIDE.md)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review production readiness documentation
3. Check Docker logs: `docker-compose logs -f`
4. Open an issue on GitHub

---

**Last Updated:** January 7, 2026
