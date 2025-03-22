#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment process...${NC}"

# Check for proper Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! node --version | grep -q "v18"; then
  echo -e "${RED}Error: Node.js v18.x is required.${NC}"
  echo "Current version: $(node --version)"
  exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Fix Babel configuration
echo -e "${YELLOW}Fixing Babel configuration...${NC}"
node fix-babel.js

# Fix font imports to avoid SWC conflicts
echo -e "${YELLOW}Fixing font imports...${NC}"
node fix-fonts.js

# Run build
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Check build status
if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed. Please check the logs for errors.${NC}"
  exit 1
fi

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
npx vercel --prod

# Check deployment status
if [ $? -ne 0 ]; then
  echo -e "${RED}Deployment failed. Please check the logs for errors.${NC}"
  exit 1
else
  echo -e "${GREEN}Deployment successful!${NC}"
fi 