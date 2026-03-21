#!/bin/bash
# ============================================
#  Spis Castle Audio Guide — Hetzner Deploy
#  Run this on a fresh Ubuntu 22.04+ server
# ============================================

set -e

echo "=========================================="
echo "  Spis Castle — Server Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. System updates
echo -e "${YELLOW}[1/6] Updating system...${NC}"
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Docker
echo -e "${YELLOW}[2/6] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 3. Install Docker Compose
echo -e "${YELLOW}[3/6] Installing Docker Compose...${NC}"
if ! command -v docker compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# 4. Setup firewall
echo -e "${YELLOW}[4/6] Configuring firewall...${NC}"
apt-get install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. Generate JWT secret
echo -e "${YELLOW}[5/6] Generating JWT secret...${NC}"
JWT_SECRET=$(openssl rand -hex 32)
export JWT_SECRET
echo "JWT_SECRET=$JWT_SECRET" > /root/.spis-castle-env
echo -e "${GREEN}JWT Secret saved to /root/.spis-castle-env${NC}"

# 6. Start services
echo -e "${YELLOW}[6/6] Starting services...${NC}"
cd "$(dirname "$0")/../docker"
docker compose up -d --build

# Wait for MongoDB to initialize
echo "Waiting for database initialization..."
sleep 15

echo ""
echo -e "${GREEN}=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "==========================================${NC}"
echo ""
echo "  API:     http://$(hostname -I | awk '{print $1}')/api/health"
echo "  Admin:   admin / admin123"
echo ""
echo "  IMPORTANT: Change admin password immediately!"
echo ""
echo "  Next steps:"
echo "  1. Point your domain DNS to this server IP"
echo "  2. Run: ./setup-ssl.sh your-domain.com"
echo "  3. Update EXPO_PUBLIC_BACKEND_URL in frontend"
echo "=========================================="
