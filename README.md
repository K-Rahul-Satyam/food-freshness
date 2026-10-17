# 🥑 FreshGuard — AI Food Freshness & Quality Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-AWS%20Cloud-00C853?style=for-the-badge&logo=googlechrome&logoColor=white)](http://3.106.250.59/)
[![AWS](https://img.shields.io/badge/Hosted%20on-AWS%20EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](http://3.106.250.59/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)

**FreshGuard** is an AI-powered computer vision and automated inventory management platform engineered to evaluate food freshness, predict remaining shelf life, detect defects, and optimize grocery and cold-storage operations.

---

## 🌐 Live Application

- **Live URL**: **[http://3.106.250.59/](http://3.106.250.59/)**
- **API Documentation (Swagger)**: **[http://3.106.250.59:8000/docs](http://3.106.250.59:8000/docs)**

### Default Demo Credentials

| Role | Username / Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |
| **Auditor / Operator** | `demouser` | `password123` |

---

## ✨ Features

- **Autonomous Food Freshness Grading**: Computer vision algorithms evaluating CIE $L^*a^*b^*$ Browning Index (BI), surface texture entropy, and Laplacian roughness.
- **Defect & Mold Identification**: Pinpoints mycelium mold colonies, subcutaneous bruising, and mechanical cuts with color-coded diagnostic masks.
- **Shelf-Life Estimation**: Compares ambient ($20\text{--}25^\circ\text{C}$) versus cold storage ($2\text{--}4^\circ\text{C}$) degradation trajectories over a 7-day projection.
- **Smart Inventory Monitoring**: Batch-level inventory counts, expiration countdowns, and FIFO dispatch recommendations.
- **AI Recommendation Assistant**: Smart preservation tips, markdown suggestions, and culinary utilization recipes.
- **Audit Reports**: Instant one-click export of verified quality audit reports in PDF format.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | FastAPI, Python 3.11, Uvicorn, Pydantic v2 |
| **Computer Vision** | OpenCV (`cv2`), NumPy, Scikit-Image, PIL |
| **Databases** | PostgreSQL 16 & MongoDB 7.0 |
| **DevOps & Cloud** | AWS EC2, Docker, Docker Compose, Nginx Reverse Proxy |

---

## 🚀 Getting Started Locally

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

### 1-Click Launch with Docker Compose
```bash
# Clone the repository
git clone https://github.com/K-Rahul-Satyam/food-freshness.git
cd food-freshness

# Build and run containers
docker compose up --build
```

- **Frontend Application**: `http://localhost:3000` (or `http://localhost`)
- **Interactive API Docs**: `http://localhost:8000/docs`

---

### Manual Setup (Without Docker)

#### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
python main.py
```
*Backend runs on `http://127.0.0.1:8000`*

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## ☁️ Cloud Deployment

The live system is deployed on an **AWS EC2 Ubuntu instance** using multi-stage Docker containers with Nginx routing requests between the React frontend and the FastAPI backend.

To deploy on your own AWS instance:
```bash
# On your AWS EC2 instance
git clone https://github.com/K-Rahul-Satyam/food-freshness.git
cd food-freshness
docker compose up -d --build
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
