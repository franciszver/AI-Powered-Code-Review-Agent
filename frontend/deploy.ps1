# Frontend Deploy Script for AWS Amplify
# Usage: .\deploy.ps1

param(
    [string]$AppName = "ai-code-review-frontend",
    [string]$BranchName = "main",
    [string]$Region = "us-west-2",
    [string]$Profile
)

# Assign default value to Profile if not provided or empty
if ([string]::IsNullOrWhiteSpace($Profile)) {
    $Profile = $env:AWS_PROFILE
}
if ([string]::IsNullOrWhiteSpace($Profile)) {
    $Profile = "default"
}

$ErrorActionPreference = "Stop"
$env:AWS_PROFILE = $Profile

Write-Host "=== Frontend Deployment Script ===" -ForegroundColor Cyan

# Step 1: Build the frontend
Write-Host "`n[1/4] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Check if Amplify app exists, create if not
Write-Host "`n[2/4] Checking Amplify app..." -ForegroundColor Yellow
$apps = aws amplify list-apps --region $Region --query "apps[?name=='$AppName'].appId" --output text 2>$null

if ([string]::IsNullOrWhiteSpace($apps)) {
    Write-Host "Creating new Amplify app: $AppName" -ForegroundColor Green
    $appResult = aws amplify create-app --name $AppName --region $Region --output json | ConvertFrom-Json
    $appId = $appResult.app.appId
    
    # Create the branch
    Write-Host "Creating branch: $BranchName" -ForegroundColor Green
    aws amplify create-branch --app-id $appId --branch-name $BranchName --region $Region | Out-Null
} else {
    $appId = $apps
    Write-Host "Using existing app: $appId" -ForegroundColor Green
}

# Step 3: Create deployment and get upload URL
Write-Host "`n[3/4] Creating deployment..." -ForegroundColor Yellow
$deployment = aws amplify create-deployment --app-id $appId --branch-name $BranchName --region $Region --output json | ConvertFrom-Json
$jobId = $deployment.jobId
$zipUploadUrl = $deployment.zipUploadUrl

# Step 4: Zip and upload the dist folder
Write-Host "`n[4/4] Uploading to Amplify..." -ForegroundColor Yellow

# Create zip file using tar (preserves directory structure better)
$zipPath = "dist.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Change to dist directory and zip from there
Push-Location dist
tar -a -c -f "..\$zipPath" *
Pop-Location

# Upload to Amplify
$headers = @{ "Content-Type" = "application/zip" }
Invoke-RestMethod -Uri $zipUploadUrl -Method Put -InFile $zipPath -Headers $headers

# Start the deployment
aws amplify start-deployment --app-id $appId --branch-name $BranchName --job-id $jobId --region $Region | Out-Null

# Clean up
Remove-Item $zipPath

# Get the app URL
$appDetails = aws amplify get-app --app-id $appId --region $Region --output json | ConvertFrom-Json
$defaultDomain = $appDetails.app.defaultDomain

Write-Host "`n=== Deployment Started ===" -ForegroundColor Green
Write-Host "App ID: $appId"
Write-Host "Branch: $BranchName"
Write-Host "Job ID: $jobId"
Write-Host "`nYour app will be available at:" -ForegroundColor Cyan
Write-Host "https://$BranchName.$defaultDomain" -ForegroundColor White
Write-Host "`nCheck status: aws amplify get-job --app-id $appId --branch-name $BranchName --job-id $jobId --region $Region"

