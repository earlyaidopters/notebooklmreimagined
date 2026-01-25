#!/bin/bash
# Quick setup script for GitHub Actions CI/CD
# This script helps configure the repository for CI/CD deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}NotebookLM Reimagined - CI/CD Setup${NC}"
echo "======================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI not found${NC}"
    echo "Install with: brew install gh (macOS) or apt install gh (Linux)"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
echo ""

# Get repository info
REPO=$(git config --get remote.origin.url | sed 's/.*:\(.*\)\.git/\1/')
echo -e "Repository: ${BLUE}${REPO}${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local prompt=$2

    echo -e "${YELLOW}Setting secret: ${secret_name}${NC}"
    read -sp "$prompt" secret_value
    echo ""

    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name"
        echo -e "${GREEN}✓ Set ${secret_name}${NC}"
    else
        echo -e "${YELLOW}⊘ Skipped ${secret_name} (empty value)${NC}"
    fi
    echo ""
}

# Set required secrets
echo "Required Secrets"
echo "----------------"

set_secret "GOOGLE_API_KEY" "Enter Google Gemini API key: "
set_secret "OPENROUTER_API_KEY" "Enter OpenRouter API key: "
set_secret "SUPABASE_URL" "Enter Supabase project URL: "
set_secret "SUPABASE_ANON_KEY" "Enter Supabase anonymous key: "
set_secret "SUPABASE_SERVICE_ROLE_KEY" "Enter Supabase service role key: "
set_secret "VERCEL_TOKEN" "Enter Vercel deployment token: "

# Optional secrets
echo ""
echo "Optional Secrets (press Enter to skip)"
echo "--------------------------------------"

set_secret "BACKEND_URL" "Enter backend deployment URL (optional): "
set_secret "FRONTEND_URL" "Enter frontend deployment URL (optional): "
set_secret "NEXT_PUBLIC_SUPABASE_URL" "Enter public Supabase URL (optional): "
set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Enter public Supabase key (optional): "

# Enable workflows
echo ""
echo -e "${BLUE}Enabling workflows...${NC}"
gh repo edit --enable-actions || true
echo -e "${GREEN}✓ GitHub Actions enabled${NC}"

# Create local environment files
echo ""
echo -e "${BLUE}Creating local environment files...${NC}"

# Backend .env
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# LLM Provider Configuration
DEFAULT_LLM_PROVIDER=google
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_PROVIDER=

# App Configuration
APP_NAME=NotebookLM Reimagined
DEBUG=false
EOF
    echo -e "${GREEN}✓ Created backend/.env${NC}"
    echo -e "${YELLOW}  Please update with actual values${NC}"
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'EOF'
# Supabase Configuration (Public)
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EOF
    echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
    echo -e "${YELLOW}  Please update with actual values${NC}"
fi

# Create GitHub environment for production
echo ""
echo -e "${BLUE}Creating GitHub environments...${NC}"
gh api repos/$REPO/environments/production -X PUT -f "" || true
echo -e "${GREEN}✓ Created production environment${NC}"

# Summary
echo ""
echo "======================================"
echo -e "${GREEN}CI/CD Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with actual values"
echo "2. Update frontend/.env.local with actual values"
echo "3. Push changes to trigger CI/CD"
echo ""
echo "Useful commands:"
echo "  gh run list              # View workflow runs"
echo "  gh secret list           # List all secrets"
echo "  gh workflow list         # List workflows"
echo ""
echo "For full documentation, see: .github/DEPLOYMENT_GUIDE.md"
