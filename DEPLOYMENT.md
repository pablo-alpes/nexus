# Nexus Cloud – Deployment Guide

This app runs with **local file storage** (no DB) for development, or **MongoDB** for production. Deploy with Docker and optional AWS (Terraform).

## Backend: MongoDB vs local

- **No `MONGODB_URI`** (or `USE_LOCAL_STORAGE=true`): data is stored in `data/local-db/*.json`. No MongoDB needed.
- **`MONGODB_URI` set**: the app connects to MongoDB and uses it for all persistence (Users, Requirements, Controls, Questionnaire, etc.).

Auth (login/register) and user profile (including regulation module preference) work with both backends. User model supports MongoDB and local file storage.

## Docker (single server)

1. **With MongoDB** (recommended for production):

   ```bash
   cd nexus
   cp .env.example .env
   # Edit .env: set MONGODB_URI and JWT_SECRET
   docker-compose up -d
   ```

   App: http://localhost:3000. MongoDB data in volume `mongo_data`.

2. **Build image only** (use your own MongoDB):

   ```bash
   docker build -t nexus-cloud .
   docker run -p 3000:3000 -e MONGODB_URI="mongodb://host.docker.internal:27017/nexus" -e JWT_SECRET=xxx nexus-cloud
   ```

## AWS (Terraform)

See **terraform/README.md**. Summary:

- **Single-tenant**: `terraform apply` with `mongodb_uri` or `mongodb_uri_secret_arn`. One ECS service, one ALB.
- **Per-client (enterprise)**: run Terraform per client with a different `tenant_id` (e.g. `tenant_id=client-acme`). Each client gets its own ECR repo, ECS cluster, ALB; scale with `desired_count` and task size.

MongoDB is not provisioned by Terraform; use MongoDB Atlas or Amazon DocumentDB and pass the URI (or secret ARN).

## User profile and regulation modules

- **Profile** is under **Dashboard → Quick Start → "Profile & regulation module"** (or `/dashboard/profile`, `/chile-privacy/dashboard/profile`).
- **Regulation module** tab: user can choose which regulation modules are enabled and which is the primary (default dashboard). Stored in user profile in MongoDB (or local User store).
- Adding a new regulation: extend `lib/regulations.ts` (enum, config, `getRegulationModules()`), add routes/pages, then users can enable it in Profile. No infra changes needed.

## Checklist for production

1. Set `MONGODB_URI` (or use Secrets Manager with Terraform).
2. Set a strong `JWT_SECRET`.
3. Do not set `USE_LOCAL_STORAGE` in production.
4. Use HTTPS (ALB + ACM in Terraform, or your reverse proxy).
5. Run precompute/import scripts as needed (e.g. requirements, questionnaire) against the same MongoDB.
