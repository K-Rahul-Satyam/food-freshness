# Azure Cloud Deployment Guide - Food Freshness Platform
This guide provides the complete, step-by-step instructions and automated scripts to deploy the containerized Food Freshness platform to **Microsoft Azure**.

---

## 🏗️ Architecture Overview

The application is fully containerized across four microservices:
1. **Frontend**: React + Vite compiled into a static distribution, served by an Alpine Nginx reverse proxy on port 80.
2. **Backend**: FastAPI REST API + Computer Vision engine (Uvicorn) on port 8000.
3. **Primary Database**: PostgreSQL 16 (for relational inventory, user auth, audit logs).
4. **NoSQL Database**: MongoDB 7.0 (for high-velocity IoT environmental readings & tensor histograms).

---

## 🚀 Option 1: Fast Single-VM Deployment (Azure VM + Docker Compose)
*Recommended for quick proof-of-concept, demo environments, or cost savings ($15–$30/month).*

### Step 1: Create an Azure Resource Group and Ubuntu VM
```bash
# 1. Create Resource Group
az group create --name rg-foodfreshness --location eastus

# 2. Create an Ubuntu 22.04 LTS VM with standard B2s size
az vm create \
  --resource-group rg-foodfreshness \
  --name vm-foodfreshness \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

# 3. Open Ports 80 (HTTP) and 8000 (Backend API optional)
az vm open-port --resource-group rg-foodfreshness --name vm-foodfreshness --port 80 --priority 1001
az vm open-port --resource-group rg-foodfreshness --name vm-foodfreshness --port 443 --priority 1002
```

### Step 2: SSH into the Azure VM and Install Docker
```bash
ssh azureuser@<YOUR_VM_PUBLIC_IP>

# Update and install Docker + Docker Compose
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

### Step 3: Deploy the Project
```bash
# Clone the repository
git clone <YOUR_GIT_REPO_URL> food-freshness
cd food-freshness

# Start the full stack with Docker Compose
docker compose up -d --build

# Verify all 4 containers are running healthy
docker compose ps
```
Access the application immediately in your browser at: `http://<YOUR_VM_PUBLIC_IP>`

---

## ☁️ Option 2: Serverless Container Deployment (Azure Container Apps / App Service)
*Recommended for production-grade auto-scaling, managed SSL, and enterprise reliability.*

### Step 1: Create Azure Container Registry (ACR)
```bash
# 1. Set environment variables
RESOURCE_GROUP="rg-foodfreshness"
LOCATION="eastus"
ACR_NAME="freshguardacr$RANDOM"

az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# 3. Retrieve ACR Credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
```

### Step 2: Build & Push Docker Images to ACR
```bash
# Log in to ACR
az acr login --name $ACR_NAME

# Build and push Backend
docker build -t $ACR_NAME.azurecr.io/backend:latest ./backend
docker push $ACR_NAME.azurecr.io/backend:latest

# Build and push Frontend
docker build -t $ACR_NAME.azurecr.io/frontend:latest ./frontend
docker push $ACR_NAME.azurecr.io/frontend:latest
```

### Step 3: Provision Managed Databases on Azure
```bash
# 1. Azure Database for PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name freshguard-postgres \
  --location $LOCATION \
  --admin-user dbadmin \
  --admin-password 'P@ssword12345!' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --yes

# 2. Allow Azure services to access PostgreSQL
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name freshguard-postgres \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 3. Azure Cosmos DB for MongoDB (vCore or Request Units)
az cosmosdb create \
  --resource-group $RESOURCE_GROUP \
  --name freshguard-cosmos \
  --kind MongoDB \
  --locations regionName=$LOCATION failoverPriority=0
```

### Step 4: Deploy Container App Services
```bash
# Create App Service Plan (Linux)
az appservice plan create \
  --name freshguard-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Deploy Backend Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan freshguard-plan \
  --name freshguard-backend-api \
  --deployment-container-image-name $ACR_NAME.azurecr.io/backend:latest

# Configure Backend Environment Variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name freshguard-backend-api \
  --settings \
    DATABASE_URL="postgresql://dbadmin:P%40ssword12345!@freshguard-postgres.postgres.database.azure.com:5432/food_freshness?sslmode=require" \
    SECRET_KEY="freshguard_production_jwt_secret_key" \
    PORT=8000 \
    WEBSITES_PORT=8000

# Deploy Frontend Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan freshguard-plan \
  --name freshguard-portal \
  --deployment-container-image-name $ACR_NAME.azurecr.io/frontend:latest

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name freshguard-portal \
  --settings WEBSITES_PORT=80
```

---

## 🛠️ Verification & Health Checks

Once deployed, run these commands to verify service availability:

1. **Backend Health Check**:
   ```bash
   curl http://<YOUR_APP_URL>/api/stats
   ```
2. **Frontend UI**:
   Open `http://<YOUR_APP_URL>` in any browser and log in with the administrator or manager credentials:
   - **Admin**: `admin@freshguard.io` / `admin123`
   - **Retail**: `retail@freshguard.io` / `retail123`
   - **Inspector**: `inspector@freshguard.io` / `inspector123`
   - **Warehouse**: `warehouse@freshguard.io` / `warehouse123`
