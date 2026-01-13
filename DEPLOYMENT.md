# Leaseo VPS Deployment Guide

This guide covers deploying Leaseo on a Hostinger VPS or any Linux server.

## Prerequisites

- Node.js 20+ 
- PostgreSQL 15+
- Nginx (recommended for reverse proxy)
- PM2 (for process management)

## Quick Start

### 1. Upload Files

Upload the extracted zip contents to your VPS:
```bash
scp -r leaseo/* user@your-vps-ip:/var/www/leaseo
```

Or use FTP/SFTP from Hostinger panel.

### 2. Install Dependencies

```bash
cd /var/www/leaseo
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update all the values in `.env`:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - Generate with `openssl rand -hex 32`
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `BASE_URL` - Your domain (e.g., https://leaseo.in)
- SMTP settings for email
- Payment gateway credentials

### 4. Setup PostgreSQL Database

```bash
# Create database
sudo -u postgres createdb leaseo

# Create user
sudo -u postgres psql -c "CREATE USER leaseo WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE leaseo TO leaseo;"

# Import the database
psql -U leaseo -d leaseo -f database_export.sql
```

### 5. Build the Application

```bash
# For production, use the production vite config
cp vite.config.production.ts vite.config.ts
npm run build
```

### 6. Create Upload Directory

```bash
mkdir -p uploads/public uploads/private
chmod 755 uploads
```

### 7. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "leaseo" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 8. Configure Nginx

Create `/etc/nginx/sites-available/leaseo`:

```nginx
server {
    listen 80;
    server_name leaseo.in www.leaseo.in;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name leaseo.in www.leaseo.in;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/leaseo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leaseo.in/privkey.pem;

    # Static files (uploaded images)
    location /uploads/ {
        alias /var/www/leaseo/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/leaseo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d leaseo.in -d www.leaseo.in
```

## Default Admin Login

- Email: `admin@leaseo.in`
- Password: `Admin@123`

**Important:** Change the admin password immediately after first login!

## File Structure

```
/var/www/leaseo/
├── client/           # Frontend React code
├── server/           # Backend Express code
├── shared/           # Shared types and schemas
├── dist/             # Built production files
├── uploads/          # User uploaded files
│   ├── public/       # Public images
│   └── private/      # Private documents
├── database_export.sql  # Database backup
├── .env              # Environment configuration
└── package.json
```

## Useful Commands

```bash
# View logs
pm2 logs leaseo

# Restart application
pm2 restart leaseo

# Stop application
pm2 stop leaseo

# Monitor resources
pm2 monit

# Database backup
pg_dump -U leaseo leaseo > backup_$(date +%Y%m%d).sql

# Update application
git pull origin main
npm install
npm run build
pm2 restart leaseo
```

## Troubleshooting

### Application won't start
1. Check logs: `pm2 logs leaseo`
2. Verify `.env` file exists and has correct values
3. Check database connection: `psql $DATABASE_URL`

### Database connection issues
1. Ensure PostgreSQL is running: `sudo systemctl status postgresql`
2. Check connection string in `.env`
3. Verify user permissions

### File uploads not working
1. Check upload directory permissions: `ls -la uploads/`
2. Ensure Nginx is configured to serve `/uploads/`
3. Check disk space: `df -h`

### 502 Bad Gateway
1. Check if Node.js is running: `pm2 status`
2. Verify port 5000 is correct in Nginx config
3. Check firewall: `sudo ufw status`

## Security Recommendations

1. **Change default passwords** - Update admin password immediately
2. **Enable firewall** - Only allow ports 22, 80, 443
3. **Regular backups** - Schedule daily database backups
4. **Keep updated** - Regularly update Node.js and dependencies
5. **Monitor logs** - Set up log rotation and monitoring

## Support

For issues, check:
- Application logs: `pm2 logs leaseo`
- Nginx logs: `/var/log/nginx/error.log`
- Database logs: `/var/log/postgresql/`
