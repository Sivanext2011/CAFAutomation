# CAF Automation Portal

Internal CAF automation portal for NRF integrations, running inside the CAF Kubernetes cluster.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  CAF Kubernetes Cluster (same namespace)        │
│                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Frontend │───▶│ Backend  │───▶│ beamctl  │  │
│  │ (React)  │    │ (FastAPI)│    │ (CLI)    │  │
│  └──────────┘    └────┬─────┘    └──────────┘  │
│                       │                         │
│                  ┌────▼─────┐                   │
│                  │ PVC /data│                   │
│                  │ (JSON)   │                   │
│                  └──────────┘                   │
└─────────────────────────────────────────────────┘
```

## Supported Operations

- Add/Delete/Get/List NRF Server
- Add/Delete/Get/List NRF OAuth Server
- List/Update Registration Properties
- List/Update/Delete NF Profile Config
- Live execution console (WebSocket)
- Job history

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Kubernetes Deployment
```bash
# Build images
docker build -t caf-automation-backend:latest ./backend
docker build -t caf-automation-frontend:latest ./frontend

# Deploy
kubectl apply -f k8s/deployment.yaml
```

## Initial Setup Flow

1. Open the portal
2. Provide OAM Site Domain Name (e.g., `bam-cluster01.operator.com`)
3. Portal downloads `beamctl` binary and configures FQDN
4. Login with IAM credentials
5. Start managing NRF configurations

## Project Structure

```
├── backend/
│   ├── api/            # FastAPI route handlers
│   ├── services/       # Business logic
│   ├── executor/       # beamctl subprocess execution
│   ├── validators/     # Input validation
│   ├── storage/        # JSON file storage
│   ├── websocket/      # Live log streaming
│   ├── models/         # Pydantic models
│   ├── main.py         # App entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── pages/      # Page components
│   │   ├── App.tsx     # Main layout
│   │   └── main.tsx    # Entry point
│   ├── Dockerfile
│   └── nginx.conf
├── k8s/
│   └── deployment.yaml
├── data/               # PVC mount point
│   ├── jobs/
│   ├── configs/
│   ├── templates/
│   ├── logs/
│   ├── state/
│   └── defaults/
└── docs/               # Reference documentation
```
