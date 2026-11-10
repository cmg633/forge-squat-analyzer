# Forge Backend Deployment to Hugging Face Spaces (Docker SDK)
param (
    [Parameter(Mandatory=$true)]
    [string]$HfUsername,
    [Parameter(Mandatory=$false)]
    [string]$HfToken = $env:HF_TOKEN,
    [Parameter(Mandatory=$false)]
    [string]$SpaceName = "forge-squat-backend"
)

Write-Host "=== Deploying Forge Backend to Hugging Face Spaces ===" -ForegroundColor Cyan

if ($HfToken) {
    Write-Host "Logging into Hugging Face CLI..."
    huggingface-cli login --token $HfToken
}

$repoUrl = "https://huggingface.co/spaces/$HfUsername/$SpaceName"
Write-Host "Target Space: $repoUrl"

# Initialize git if not already
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

# Create or verify space
huggingface-cli repo create $SpaceName --type space --space-sdk docker --yes

# Set remote and push
git remote remove hf 2>$null
git remote add hf $repoUrl
git add .
git commit -m "Deploy Forge AI Squat Analyser Backend"
git push -f hf main

Write-Host "`nBackend successfully deployed!" -ForegroundColor Green
Write-Host "Your live backend URL: https://$HfUsername-$SpaceName.hf.space" -ForegroundColor Yellow
Write-Host "API Health Check: https://$HfUsername-$SpaceName.hf.space/health" -ForegroundColor Yellow
Write-Host "Swagger Docs: https://$HfUsername-$SpaceName.hf.space/docs" -ForegroundColor Yellow

