# ==============================================================================
# FreshGuard Food Freshness Platform - Azure Cloud Deployment Script (PowerShell)
# ==============================================================================
param (
    [string]$ResourceGroup = "rg-foodfreshness",
    [string]$Location = "eastus",
    [string]$AcrName = ("freshguardacr" + (Get-Random -Minimum 1000 -Maximum 9999)),
    [string]$PlanName = "freshguard-plan",
    [string]$BackendAppName = ("freshguard-api-" + (Get-Random -Minimum 1000 -Maximum 9999)),
    [string]$FrontendAppName = ("freshguard-web-" + (Get-Random -Minimum 1000 -Maximum 9999))
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Azure Cloud Container Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host "Resource Group : $ResourceGroup"
Write-Host "Location       : $Location"
Write-Host "ACR Name       : $AcrName"
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Create Resource Group
Write-Host "👉 Step 1: Creating Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location

# 2. Create Azure Container Registry
Write-Host "👉 Step 2: Creating Azure Container Registry..." -ForegroundColor Yellow
az acr create --resource-group $ResourceGroup --name $AcrName --sku Basic --admin-enabled true

$AcrLoginServer = (az acr show --name $AcrName --query loginServer --output tsv)
$AcrUsername = (az acr credential show --name $AcrName --query username --output tsv)
$AcrPassword = (az acr credential show --name $AcrName --query "passwords[0].value" --output tsv)

Write-Host "✅ ACR Login Server: $AcrLoginServer" -ForegroundColor Green

# 3. Build & Push Docker Images
Write-Host "👉 Step 3: Building & Pushing Docker Containers to ACR..." -ForegroundColor Yellow
az acr login --name $AcrName

docker build -t "$AcrLoginServer/food-freshness-backend:latest" ./backend
docker push "$AcrLoginServer/food-freshness-backend:latest"

docker build -t "$AcrLoginServer/food-freshness-frontend:latest" ./frontend
docker push "$AcrLoginServer/food-freshness-frontend:latest"

# 4. Create App Service Plan (Linux)
Write-Host "👉 Step 4: Creating Linux App Service Plan..." -ForegroundColor Yellow
az appservice plan create --name $PlanName --resource-group $ResourceGroup --is-linux --sku B1

# 5. Deploy Backend Container
Write-Host "👉 Step 5: Deploying Backend API..." -ForegroundColor Yellow
az webapp create --resource-group $ResourceGroup --plan $PlanName --name $BackendAppName --deployment-container-image-name "$AcrLoginServer/food-freshness-backend:latest"

az webapp config container set --name $BackendAppName --resource-group $ResourceGroup --docker-custom-image-name "$AcrLoginServer/food-freshness-backend:latest" --docker-registry-server-url "https://$AcrLoginServer" --docker-registry-server-user $AcrUsername --docker-registry-server-password $AcrPassword

az webapp config appsettings set --resource-group $ResourceGroup --name $BackendAppName --settings WEBSITES_PORT=8000 SECRET_KEY="freshguard_azure_production_secret_key"

# 6. Deploy Frontend Container
Write-Host "👉 Step 6: Deploying Frontend..." -ForegroundColor Yellow
az webapp create --resource-group $ResourceGroup --plan $PlanName --name $FrontendAppName --deployment-container-image-name "$AcrLoginServer/food-freshness-frontend:latest"

az webapp config container set --name $FrontendAppName --resource-group $ResourceGroup --docker-custom-image-name "$AcrLoginServer/food-freshness-frontend:latest" --docker-registry-server-url "https://$AcrLoginServer" --docker-registry-server-user $AcrUsername --docker-registry-server-password $AcrPassword

az webapp config appsettings set --resource-group $ResourceGroup --name $FrontendAppName --settings WEBSITES_PORT=80

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🎉 Azure Cloud Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "Backend URL : https://$BackendAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Frontend URL: https://$FrontendAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
