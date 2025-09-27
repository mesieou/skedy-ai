#!/bin/bash
# Skedy AI - Server Setup Script for Kamatera Ubuntu Server
# This script sets up Nginx, SSL certificates, and prepares the server for deployment

set -e

echo "🚀 Setting up Skedy AI server on Kamatera..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y nginx certbot python3-certbot-nginx curl git

# Create application directory
APP_DIR="/root/skedy-ai"
echo "📁 Creating application directory: $APP_DIR"
mkdir -p $APP_DIR

# Setup Nginx configuration
echo "🔧 Setting up Nginx configuration..."
cp nginx.conf /etc/nginx/nginx.conf

# Test Nginx configuration
nginx -t

# Create web root for Let's Encrypt challenges
mkdir -p /var/www/certbot

# Start Nginx
systemctl enable nginx
systemctl start nginx

# Setup SSL certificates with Let's Encrypt
echo "🔒 Setting up SSL certificates..."
echo "Please make sure your domain (skedy.ai) points to this server IP: 45.151.154.42"
read -p "Press Enter when DNS is configured and ready..."

# Get SSL certificates
certbot --nginx -d skedy.ai -d www.skedy.ai --non-interactive --agree-tos --email your-email@example.com

# Setup automatic certificate renewal
echo "⏰ Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -


# Setup firewall (UFW)
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3000  # For direct container access if needed

# Create deployment user (optional, for better security)
echo "👤 Creating deployment user..."
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Setup log rotation for Docker
cat > /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

# Create monitoring script
cat > /root/monitor-skedy.sh << 'EOF'
#!/bin/bash
# Simple monitoring script for Skedy AI

CONTAINER_NAME="skedy-ai"
HEALTH_URL="http://localhost:3000/api/health"

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "$(date): Container $CONTAINER_NAME is not running. Starting..."
    docker start $CONTAINER_NAME
    sleep 10
fi

# Check health endpoint
if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "$(date): Health check failed. Restarting container..."
    docker restart $CONTAINER_NAME
fi
EOF

chmod +x /root/monitor-skedy.sh

# Add monitoring to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-skedy.sh >> /var/log/skedy-monitor.log 2>&1") | crontab -

# Create backup script
cat > /root/backup-skedy.sh << 'EOF'
#!/bin/bash
# Backup script for Skedy AI

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup environment files
cp /root/skedy-ai/.env.production $BACKUP_DIR/env_$DATE.backup

# Backup Docker images (optional)
docker save skedy-ai:latest | gzip > $BACKUP_DIR/skedy-ai_$DATE.tar.gz

# Keep only last 7 backups
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): Backup completed"
EOF

chmod +x /root/backup-skedy.sh

# Add backup to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-skedy.sh >> /var/log/skedy-backup.log 2>&1") | crontab -

echo "✅ Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your GitHub repository URL in the workflow file"
echo "2. Add all required secrets to your GitHub repository"
echo "3. Push your code to trigger the first deployment"
echo "4. Your site will be available at: https://skedy.ai"
echo ""
echo "🔧 Useful commands:"
echo "- Check container status: docker ps"
echo "- View container logs: docker logs skedy-ai"
echo "- Check health: curl http://localhost:3000/api/health"
echo "- Monitor logs: tail -f /var/log/skedy-monitor.log"
echo ""
echo "🎉 Happy deploying!"
