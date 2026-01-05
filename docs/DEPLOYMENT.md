# Production Deployment Guide

## Server Requirements

- Ubuntu 20.04+ or similar
- Node.js 18+
- MySQL 8.0+
- Nginx (as reverse proxy)
- SSL certificate
- Minimum 2GB RAM
- 20GB disk space

## Step 1: Server Setup

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### Install PM2

```bash
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt install -y nginx
```

## Step 2: Application Deployment

### Clone Repository

```bash
cd /var/www
sudo git clone <repository-url> whatsapp-gateway
cd whatsapp-gateway
sudo chown -R $USER:$USER .
```

### Install Dependencies

```bash
npm install --production
```

### Configure Environment

```bash
cp .env.example .env
nano .env
```

**Production `.env`:**
```env
NODE_ENV=production
PORT=3000
APP_URL=https://gateway.yourdomain.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_gateway
DB_USER=gateway_user
DB_PASSWORD=<strong-password>

SESSION_SECRET=<generate-strong-random-secret>

AUTH_SERVER_URL=https://membership.yourdomain.com
OAUTH_CLIENT_ID=<your-client-id>
OAUTH_CLIENT_SECRET=<your-client-secret>
OAUTH_REDIRECT_URI=https://gateway.yourdomain.com/auth/callback

LOG_LEVEL=warn
```

### Create Database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE whatsapp_gateway;
CREATE USER 'gateway_user'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON whatsapp_gateway.* TO 'gateway_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Initialize Database

```bash
npm run db:init
```

### Build Assets

```bash
npm run build:css
```

## Step 3: PM2 Configuration

### Start Application

```bash
pm2 start ecosystem.config.js --env production
```

### Configure PM2 Startup

```bash
pm2 startup
pm2 save
```

### Monitor

```bash
pm2 status
pm2 logs whatsapp-gateway
pm2 monit
```

## Step 4: Nginx Configuration

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/whatsapp-gateway
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name gateway.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gateway.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/gateway.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/gateway-access.log;
    error_log /var/log/nginx/gateway-error.log;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location /css/ {
        alias /var/www/whatsapp-gateway/public/css/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /var/www/whatsapp-gateway/public/js/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: SSL Certificate

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
sudo certbot --nginx -d gateway.yourdomain.com
```

### Auto-renewal

```bash
sudo certbot renew --dry-run
```

## Step 6: Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 7: Monitoring & Maintenance

### Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/whatsapp-gateway
```

```
/var/www/whatsapp-gateway/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Database Backup

Create backup script:

```bash
sudo nano /usr/local/bin/backup-gateway-db
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gateway"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u gateway_user -p'password' whatsapp_gateway | gzip > $BACKUP_DIR/gateway_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "gateway_*.sql.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-gateway-db
```

Add to crontab:

```bash
sudo crontab -e
```

```
0 2 * * * /usr/local/bin/backup-gateway-db
```

### Health Check Monitoring

Use a service like UptimeRobot or Pingdom to monitor:

```
https://gateway.yourdomain.com/health
```

## Updating the Application

```bash
cd /var/www/whatsapp-gateway
git pull
npm install --production
npm run build:css
pm2 reload whatsapp-gateway
```

## Troubleshooting

### Check Application Logs

```bash
pm2 logs whatsapp-gateway
tail -f logs/combined.log
tail -f logs/error.log
```

### Check PM2 Status

```bash
pm2 status
pm2 describe whatsapp-gateway
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/gateway-error.log
```

### Restart Services

```bash
pm2 restart whatsapp-gateway
sudo systemctl restart nginx
sudo systemctl restart mysql
```

## Security Checklist

- [ ] Strong database password
- [ ] Strong SESSION_SECRET
- [ ] SSL certificate installed and working
- [ ] Firewall configured
- [ ] Regular backups setup
- [ ] Log rotation configured
- [ ] PM2 startup script enabled
- [ ] Nginx security headers configured
- [ ] OAuth credentials secured
- [ ] API keys encrypted at rest

## Performance Tuning

### MySQL

```sql
SET GLOBAL max_connections = 200;
SET GLOBAL innodb_buffer_pool_size = 1G;
```

### PM2 Cluster Mode

Adjust instances in `ecosystem.config.js` based on CPU cores:

```js
instances: 'max' // or specific number
```

### Nginx Caching

Add caching for static assets and API responses as needed.

