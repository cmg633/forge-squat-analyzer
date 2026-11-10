# Forge Frontend Deployment to Vercel
param (
    [Parameter(Mandatory=$false)]
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [Parameter(Mandatory=$false)]
    [string]$BackendUrl = "https://your-username-forge-squat-backend.hf.space"
)

Write-Host "=== Deploying Forge Frontend to Vercel ===" -ForegroundColor Cyan

cd frontend

Write-Host "Building production frontend bundle..."
$env:VITE_API_URL = $BackendUrl
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please check errors." -ForegroundColor Red
    exit 1
}

Write-Host "Deploying to Vercel..."
if ($VercelToken) {
    npx vercel --token $VercelToken --prod --yes --build-env VITE_API_URL=$BackendUrl
} else {
    npx vercel --prod --build-env VITE_API_URL=$BackendUrl
}

Write-Host "`nFrontend successfully deployed to Vercel!" -ForegroundColor Green
cd ..

