# 🚀 Skedy AI - Docker Deployment Guide

This guide covers deploying Skedy AI to your Kamatera server using Docker and GitHub Actions.

## 📋 Prerequisites

- ✅ Kamatera server (Ubuntu 24.04 LTS, 2 vCPU, 2GB RAM)
- ✅ Docker installed on server
- ✅ Domain name pointing to server IP (45.151.154.42)
- ✅ GitHub repository with Actions enabled
- ✅ Production environment variables ready

## 🏗️ Architecture Overview

```
Internet → Nginx (SSL/Reverse Proxy) → Next.js Container (Port 3000)
                                    ↓
External Services: Supabase + Redis + OpenAI + Twilio
```

## 🔧 Server Setup

### 1. Initial Server Configuration

SSH into your Kamatera server and run the setup script:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/skedy-ai.git /root/skedy-ai
cd /root/skedy-ai

# Make setup script executable and run it
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

This script will:
- Install Nginx and Certbot
- Configure SSL certificates with Let's Encrypt
- Setup firewall rules
- Create monitoring and backup scripts
- Configure automatic certificate renewal

### 2. Domain Configuration

Ensure your domain DNS is configured:
- `skedy.io` → A record → `45.151.154.42`
- `www.skedy.io` → CNAME → `skedy.io`

## 🔐 GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

### SSH Configuration
```
SSH_PRIVATE_KEY=<your-private-key>
SSH_KNOWN_HOSTS=<server-fingerprint>
```

### Database (Supabase Production)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Redis (Production)
```
VOICE_REDIS_HOST=your-redis-host.com
VOICE_REDIS_PORT=6379
VOICE_REDIS_DB=0
VOICE_REDIS_PASSWORD=your-redis-password
```

### AI Services
```
OPENAI_API_KEY=sk-proj-...
OPENAI_WEBHOOK_SECRET=whsec_...
```

### Communication Services
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Google Services
```
GOOGLE_MAPS_API_KEY=AIza...
```

### Demo Business IDs
```
DEMO_REMOVALIST_BUSINESS_ID=uuid-for-removalist-business
DEMO_MANICURIST_BUSINESS_ID=uuid-for-manicurist-business
DEMO_PLUMBER_BUSINESS_ID=uuid-for-plumber-business
```

### Security
```
CRON_SECRET=your-secure-cron-secret-key
```

## 🚀 Deployment Process

### Automatic Deployment

1. **Push to main branch** - Triggers automatic deployment
2. **Manual deployment** - Use GitHub Actions "Run workflow" button

### Deployment Steps (Automated)

1. **Code Pull** - Latest code from main branch
2. **Docker Build** - Creates optimized production image
3. **Health Check** - Ensures new container is healthy
4. **Zero-Downtime Switch** - Replaces old container
5. **Cleanup** - Removes old images and containers

### Manual Deployment Commands

If you need to deploy manually:

```bash
# SSH into server
ssh root@45.151.154.42

# Navigate to app directory
cd /root/skedy-ai

# Pull latest code
git pull origin main

# Build and deploy
docker build -t skedy-ai:$(date +%Y%m%d%H%M) .
docker stop skedy-ai || true
docker rm skedy-ai || true
docker run -d -p 3000:3000 \
  --env-file .env.production \
  --name skedy-ai \
  --restart unless-stopped \
  --memory="1g" \
  --cpus="1.5" \
  skedy-ai:$(date +%Y%m%d%H%M)
```

## 🔍 Monitoring & Maintenance

### Health Checks

- **Container Health**: `docker ps`
- **Application Health**: `curl http://localhost:3000/api/health`
- **Nginx Status**: `systemctl status nginx`
- **SSL Certificate**: `certbot certificates`

### Log Monitoring

```bash
# Container logs
docker logs skedy-ai -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitoring script logs
tail -f /var/log/skedy-monitor.log
```

### Automatic Monitoring

The setup script creates:
- **Health monitoring** - Checks every 5 minutes
- **Auto-restart** - Restarts unhealthy containers
- **Log rotation** - Prevents disk space issues
- **Daily backups** - Environment and image backups

## 🛠️ Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker logs skedy-ai

# Check environment variables
docker exec skedy-ai env | grep -E "(SUPABASE|REDIS|OPENAI)"

# Restart container
docker restart skedy-ai
```

#### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificates
certbot renew --dry-run

# Test Nginx configuration
nginx -t
```

#### WebRTC/WebSocket Issues
```bash
# Check Nginx configuration
nginx -t

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  https://skedy.io/api/realtime-session
```

### Performance Optimization

#### Container Resources
```bash
# Monitor resource usage
docker stats skedy-ai

# Adjust memory/CPU limits in deployment script
--memory="2g" --cpus="2"
```

#### Database Connections
- Monitor Supabase connection pool
- Check Redis connection status
- Review application logs for connection errors

## 🔄 Updates & Rollbacks

### Rolling Updates
The deployment uses zero-downtime rolling updates:
1. New container starts on temporary port
2. Health check validates new version
3. Traffic switches to new container
4. Old container is removed

### Rollback Process
```bash
# List available images
docker images skedy-ai

# Rollback to previous version
docker stop skedy-ai
docker rm skedy-ai
docker run -d -p 3000:3000 \
  --env-file .env.production \
  --name skedy-ai \
  --restart unless-stopped \
  skedy-ai:PREVIOUS_TAG
```

## 📊 Performance Metrics

### Expected Performance
- **Cold start**: ~10-15 seconds
- **Memory usage**: ~200-400MB
- **Response time**: <200ms for API calls
- **WebRTC latency**: <100ms (Australia)

### Monitoring Tools
- **Health endpoint**: `/api/health`
- **Docker stats**: `docker stats`
- **Nginx metrics**: Access/error logs
- **Sentry**: Error tracking and performance

## 🔒 Security Considerations

### Container Security
- ✅ Non-root user in container
- ✅ Minimal base image (Alpine)
- ✅ Resource limits enforced
- ✅ Health checks enabled

### Network Security
- ✅ UFW firewall configured
- ✅ SSL/TLS encryption
- ✅ Rate limiting in Nginx
- ✅ Security headers configured

### Data Security
- ✅ Environment variables secured
- ✅ Secrets in GitHub encrypted
- ✅ Database connections encrypted
- ✅ API keys rotated regularly

## 📞 Support

For deployment issues:
1. Check container logs: `docker logs skedy-ai`
2. Verify health endpoint: `curl http://localhost:3000/api/health`
3. Review monitoring logs: `tail -f /var/log/skedy-monitor.log`
4. Check GitHub Actions for deployment errors

---

**🎉 Your Skedy AI application is now ready for production deployment!**
