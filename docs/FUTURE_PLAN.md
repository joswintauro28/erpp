# DATAVEX ERP - Step-by-Step Scaling Roadmap

This document details the step-by-step scaling roadmap tailored to **Next.js, NestJS, and FastAPI** for the DATAVEX ERP ecosystem.

## The Three-Stage Scaling Roadmap

### Stage 1: The Local Workstation Sandbox (Day-One Prototyping)

Teams simulate the full multi-subdomain system directly on their local workstations with zero hosting configurations.

#### 1. Local Host Name Mapping

Update your workstation's network domain lookup registry (`/etc/hosts` on Linux/macOS or `C:\Windows\System32\drivers\etc\hosts` on Windows) to capture subdomain addresses:

```
127.0.0.1  app.erp.local crm.erp.local billing.erp.local inventory.erp.local auth.erp.local ai.erp.local
```

#### 2. Local Proxy Gateway Config (`infrastructure/local/nginx.conf`)

An internal Nginx server captures inbound calls on port 80, looks at the host headers, and routes them down to the correct local application ports:

```nginx
server {
    listen 80;
    server_name crm.erp.local;
    location / { proxy_pass http://localhost:3001; } # Routes directly to Next.js CRM UI
}
server {
    listen 80;
    server_name billing.erp.local;
    location / { proxy_pass http://localhost:3002; } # Routes directly to Next.js Billing UI
}
```

#### 3. Consolidated Local Storage

A single local PostgreSQL container hosts 6 distinct database schemas in parallel. This guarantees total data isolation between microservice teams while avoiding high memory footprints on development laptops.

### Stage 2: Intermediate Production Scaling (Virtual Machines)

When moving out of local sandboxes to an active testing or early production footprint, deploy using a single or dual virtual machine layer (e.g., AWS EC2 or DigitalOcean Droplet).

- **Edge Router Automation:** Replace Nginx with **Caddy Server**. Caddy takes the place of your local ingress router and handles your traffic natively, automatically provisioning and renewing free, trusted Let's Encrypt SSL certificates for all subdomains (`.yourdomain.com`).
- **External Managed Databases:** Move databases completely out of Docker containers and connect your services to a cloud-managed database service (like AWS RDS). Host your 6 databases within this single managed instance to keep your monthly cloud infrastructure costs exceptionally low while guaranteeing automated snapshots and high performance.
- **Targeted Hot Container Swapping:** When your pipeline generates an update for a single target, your runner drops onto the server and runs a localized up command without taking down unrelated containers:
    
    ```bash
    docker compose -f infrastructure/staging-vms/docker-compose.prod.yml pull billing-service
    docker compose -f infrastructure/staging-vms/docker-compose.prod.yml up -d --no-deps billing-service
    ```
    

### Stage 3: High-Availability Enterprise Scaling (Kubernetes Cluster)

When traffic expands significantly or you need zero-downtime microservice orchestration across your separate development teams, migrate your deployment configurations to a cloud-managed Kubernetes cluster (AWS EKS or Google GKE).

- **Ingress Migration:** Caddy transforms into a **Kubernetes Ingress Controller** linked directly to a cloud Application Load Balancer, handling domain termination and load distribution.
- **Deployment Isolation:** Every directory within `apps/` and `services/` is given a standard Kubernetes YAML template, turning them into independent **Deployments** housing replicated application containers (Pods).
- **Horizontal Pod Autoscaling (HPA):** Attach runtime resource triggers directly to your deployments. If the end-of-month billing queues spike or your Python `ai-service` experiences compute-intensive model processing loads, Kubernetes automatically scales those specific application containers from 2 instances to 25 instances instantly, completely isolated from your CRM or Inventory footprints.
