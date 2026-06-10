# Nexus Cloud – AWS Terraform

This directory provisions AWS resources for running Nexus Cloud with **MongoDB** persistence and optional **per-tenant (per-client) stacks**.

## What gets created

- **ECR** – Docker image repository for the app
- **ECS Fargate** – Cluster, task definition, service (scalable)
- **ALB** – Application Load Balancer (HTTP on port 80)
- **CloudWatch** – Log group for the app
- **IAM** – Roles for ECS execution and optional Secrets Manager

MongoDB is **not** created here. Use either:

- **MongoDB Atlas** (recommended): create a cluster, get the connection string, store it in AWS Secrets Manager and set `mongodb_uri_secret_arn`, or pass it via `mongodb_uri` (dev only).
- **Amazon DocumentDB**: create the cluster and pass the URI via secret or variable.

## Quick start (single-tenant)

1. **Build and push the image** (from repo root, not terraform/):

   ```bash
   cd nexus
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker build -t nexus-cloud .
   docker tag nexus-cloud:latest <ecr_repository_url>:latest
   docker push <ecr_repository_url>:latest
   ```

   Or use the ECR URL from Terraform output after first apply.

2. **Create MongoDB** (e.g. Atlas), get `MONGODB_URI`.

3. **Terraform**:

   ```bash
   cd terraform
   terraform init
   terraform plan -var="mongodb_uri=<your-mongodb-uri>"
   terraform apply -var="mongodb_uri=<your-mongodb-uri>"
   ```

4. **Open the app**: use the ALB DNS name from `terraform output alb_dns_name` (e.g. `http://<alb_dns_name>`).

## Per-client (multi-tenant) stacks

To spin up a **separate stack per client** (enterprise “whole app per client”):

1. Use a **different `tenant_id`** per client (e.g. `client-acme`, `client-globex`).
2. Apply with a tfvars file or CI variable:

   ```bash
   terraform apply -var="tenant_id=client-acme" -var="mongodb_uri_secret_arn=arn:aws:secretsmanager:..."
   ```

   Each `tenant_id` gets its own ECR repo, ECS cluster, ALB, and log group. You can use the same or different MongoDB (e.g. one DB per tenant, or one cluster with different databases).

3. **Scale**: increase `desired_count` or adjust `cpu` / `memory_mb` per tenant as needed.

## Variables (summary)

| Variable | Description |
|----------|-------------|
| `tenant_id` | Optional. Set for per-client stacks; used in resource names. |
| `environment` | e.g. `dev`, `staging`, `prod`. |
| `mongodb_uri` | Plain MONGODB_URI (dev only; avoid in prod). |
| `mongodb_uri_secret_arn` | ARN of secret containing MONGODB_URI (recommended for prod). |
| `jwt_secret_arn` | Optional. ARN of secret for JWT_SECRET. |
| `desired_count` | Number of ECS tasks. |
| `cpu` / `memory_mb` | Task size. |
| `vpc_id` / `private_subnet_ids` / `public_subnet_ids` | Optional. Override for custom VPC. |

## Adding a new regulation module

Backend and UI are already modular (see `lib/regulations.ts` and the regulation registry). To add a new regulation:

1. Add the enum value and config in `lib/regulations.ts` (and to `getRegulationModules()`).
2. Add routes/pages for that regulation (e.g. under a new path prefix).
3. Users enable it in **Profile → Regulation module** tab.

No Terraform or Docker changes are required for new regulations.
