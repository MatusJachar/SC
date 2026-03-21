#!/bin/bash
# ============================================
#  SSL Certificate Setup with Let's Encrypt
#  Usage: ./setup-ssl.sh yourdomain.com
# ============================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

echo "Setting up SSL for: $DOMAIN"

# Stop nginx temporarily
cd "$(dirname "$0")/../docker"
docker compose stop nginx

# Get certificate
docker compose run --rm certbot certonly \
    --standalone \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Update nginx config
NGINX_CONF="$(dirname "$0")/../docker/nginx.conf"

# Uncomment HTTPS block and set domain
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" $NGINX_CONF
sed -i 's/^# \(.*listen 443\)/\1/' $NGINX_CONF
sed -i 's/^# \(.*ssl_\)/\1/' $NGINX_CONF
sed -i 's/^# \(.*proxy_\)/\1/' $NGINX_CONF
sed -i 's/^# \(.*location\)/\1/' $NGINX_CONF
sed -i 's/^# }/}/' $NGINX_CONF
sed -i 's/^# \(.*server_name\)/\1/' $NGINX_CONF
sed -i 's/^# \(.*client_max\)/\1/' $NGINX_CONF

# Add HTTP to HTTPS redirect
cat > /tmp/redirect.conf << 'REDIR'
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
REDIR

# Restart nginx
docker compose up -d nginx

echo ""
echo "SSL Setup Complete!"
echo "Your site is now available at: https://$DOMAIN"
echo "Certificate auto-renews via certbot container."
