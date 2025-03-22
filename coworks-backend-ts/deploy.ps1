# PowerShell deployment script for Windows users

Write-Host "Starting deployment process..." -ForegroundColor Yellow

# Check for proper Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
if (-not ($nodeVersion -match "v18")) {
    Write-Host "Error: Node.js v18.x is required." -ForegroundColor Red
    Write-Host "Current version: $nodeVersion"
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Fix Babel configuration
Write-Host "Fixing Babel configuration..." -ForegroundColor Yellow
node fix-babel.js

# Fix font imports to avoid SWC conflicts
Write-Host "Fixing font imports..." -ForegroundColor Yellow
node fix-fonts.js

# Run build
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Please check the logs for errors." -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
npx vercel --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed. Please check the logs for errors." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Deployment successful!" -ForegroundColor Green
} 