#!/usr/bin/env bash
# ==============================================================================
# FreshGuard Food Freshness Platform - Azure Cloud Deployment Script
# ==============================================================================
set -e

# Configuration Variables
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-foodfreshness}"
LOCATION="${LOCATION:-eastus}"
RANDOM_SUFFIX=$((1000 + RANDOM % 9000))
ACR_NAME="${ACR_NAME:-freshguardacr$RANDOM_SUFFIX}"
PLAN_NAME="${PLAN_NAME:-freshguard-plan}"
BACKEND_APP="${BACKEND_APP:-freshguard-api-$RANDOM_SUFFIX}"
FRONTEND_APP="${FRONTEND_APP:-freshguard-web-$RANDOM_SUFFIX}"

echo "=========================================================="
echo "🚀 Starting Azure Cloud Container Deployment"
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo "ACR Name       : $ACR_NAME"
echo "=========================================================="

# 1. Create Resource Group
echo "👉 Step 1: Creating Resource Group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# 2. Create Azure Container Registry
echo "👉 Step 2: Creating Azure Container Registry..."
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true

# Retrieve ACR credentials
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)

echo "✅ ACR Login Server: $ACR_LOGIN_SERVER"

# 3. Build & Push Docker Images
echo "👉 Step 3: Building & Pushing Docker Containers to ACR..."
az acr login --name "$ACR_NAME"

docker build -t "$ACR_LOGIN_SERVER/food-freshness-backend:latest" ./backend
docker push "$ACR_LOGIN_SERVER/food-freshness-backend:latest"

docker build -t "$ACR_LOGIN_SERVER/food-freshness-frontend:latest" ./frontend
docker push "$ACR_LOGIN_SERVER/food-freshness-frontend:latest"

# 4. Create App Service Plan (Linux)
echo "👉 Step 4: Creating Linux App Service Plan..."
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --is-linux \
  --sku B1

# 5. Deploy Backend Container
echo "👉 Step 5: Deploying Backend API to Azure App Service..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --name "$BACKEND_APP" \
  --deployment-container-image-name "$ACR_LOGIN_SERVER/food-freshness-backend:latest"

az webapp config container set \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --docker-custom-image-name "$ACR_LOGIN_SERVER/food-freshness-backend:latest" \
  --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
  --docker-registry-server-user "$ACR_USERNAME" \
  --docker-registry-server-password "$ACR_PASSWORD"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    WEBSITES_PORT=8000 \
    SECRET_KEY="freshguard_azure_production_secret_key"

# 6. Deploy Frontend Container
echo "👉 Step 6: Deploying Frontend to Azure App Service..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --name "$FRONTEND_APP" \
  --deployment-container-image-name "$ACR_LOGIN_SERVER/food-freshness-frontend:latest"

az webapp config container set \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --docker-custom-image-name "$ACR_LOGIN_SERVER/food-freshness-frontend:latest" \
  --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
  --docker-registry-server-user "$ACR_USERNAME" \
  --docker-registry-server-password "$ACR_PASSWORD"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --settings WEBSITES_PORT=80

echo "=========================================================="
echo "🎉 Azure Cloud Deployment Completed Successfully!"
echo "Backend URL : https://$BACKEND_APP.azurewebsites.net"
echo "Frontend URL: https://$FRONTEND_APP.azurewebsites.net"
echo "=========================================================="
