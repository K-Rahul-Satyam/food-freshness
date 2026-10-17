# AWS Cloud Deployment Guide - Food Freshness Platform
This guide provides complete instructions to deploy the containerized Food Freshness platform to **Amazon Web Services (AWS)**.

---

## 🏗️ Architecture Overview

The application is containerized across four services:
1. **Frontend**: React + Vite compiled into a static distribution, served by Nginx (or AWS S3 + CloudFront / ECS / App Runner).
2. **Backend**: FastAPI REST API + Computer Vision engine (Uvicorn) on port 8000.
3. **Primary Database**: Amazon RDS for PostgreSQL (or containerized PostgreSQL).
4. **NoSQL Database**: Amazon DocumentDB (MongoDB-compatible) or containerized MongoDB.

---

## 🚀 Option 1: Fast Single-Instance Deployment (AWS EC2 + Docker Compose)

The fastest and most direct way to get FreshGuard running on AWS:

### Step 1: Launch an AWS EC2 Instance
1. Open the **AWS Management Console** -> **EC2**.
2. Click **Launch Instance**:
   - **Name**: `freshguard-production`
   - **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
   - **Instance Type**: `t3.medium` or `t3.large` (recommended for computer vision image processing)
   - **Key Pair**: Select or create an `.pem` key pair.
   - **Network / Security Group**:
     - Allow **SSH (Port 22)** from your IP
     - Allow **HTTP (Port 80)** from `0.0.0.0/0`
     - Allow **Custom TCP (Port 8000)** from `0.0.0.0/0` (for FastAPI Swagger / Direct API access)
   - **Storage**: Minimum 20 GB gp3.

### Step 2: Connect to EC2 and Install Docker
```bash
ssh -i "your-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>

# Update packages and install Docker + Docker Compose
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2 git

# Allow ubuntu user to run Docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 3: Clone Repository and Launch
```bash
git clone https://github.com/K-Rahul-Satyam/food-freshness.git
cd food-freshness

# Build and start all services in detached mode
docker compose up -d --build

# Verify running containers
docker compose ps
```

Access your application:
- **Frontend UI**: `http://<YOUR_EC2_PUBLIC_IP>`
- **FastAPI Docs**: `http://<YOUR_EC2_PUBLIC_IP>:8000/docs`

---

## ☁️ Option 2: Managed Containers (AWS ECR + ECS / App Runner)

For scalable, zero-downtime production environments:

### Step 1: Push Containers to Amazon ECR
```bash
# Log in to AWS ECR
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name freshguard-backend
aws ecr create-repository --repository-name freshguard-frontend

# Build & Push Backend
docker build -t freshguard-backend ./backend
docker tag freshguard-backend:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/freshguard-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/freshguard-backend:latest

# Build & Push Frontend
docker build -t freshguard-frontend ./frontend
docker tag freshguard-frontend:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/freshguard-frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/freshguard-frontend:latest
```

### Step 2: Deploy Backend with AWS App Runner / ECS Fargate
1. Navigate to **AWS App Runner** -> **Create service**.
2. Select **Container registry** -> **Amazon ECR**.
3. Choose `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/freshguard-backend:latest`.
4. Configure port `8000` and set environment variables:
   - `DATABASE_URL`: Your PostgreSQL / RDS endpoint
   - `SECRET_KEY`: A secure random secret key
5. Deploy service and copy the public HTTPS App Runner URL.

### Step 3: Deploy Frontend with AWS Amplify or S3 + CloudFront
- **Option A (AWS Amplify)**: Connect your GitHub repository `food-freshness`, select the `frontend` folder, and configure build settings (`npm run build`, output dir: `dist`).
- **Option B (S3 + CloudFront)**: Build frontend locally (`npm run build`) and sync `dist/` to an S3 bucket configured for static website hosting behind CloudFront.
