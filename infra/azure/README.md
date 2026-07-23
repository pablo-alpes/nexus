# Azure deploy — Nexus Privacy (Chile SaaS)

Shared **multitenant** instance (one App Service). Isolation is by `cabinetId` / `clientId` on data, not separate infrastructures.

## Prerequisites

- Azure CLI logged in (`az login`)
- Node 20+ for local build
- MongoDB (Cosmos DB API for MongoDB from Bicep, or Atlas URI)

## 1. Provision

```bash
az group create -n rg-nexus-privacy-demo -l chilecentral

az deployment group create \
  -g rg-nexus-privacy-demo \
  -f infra/azure/main.bicep \
  -p appName=nexus-privacy-demo
```

## 2. Wire secrets

```bash
# Storage
az storage account show-connection-string -g rg-nexus-privacy-demo -n <storageAccountName>

# Cosmos Mongo connection (if createCosmos=true)
az cosmosdb keys list -g rg-nexus-privacy-demo -n <cosmosAccountName> --type connection-strings

az webapp config appsettings set -g rg-nexus-privacy-demo -n nexus-privacy-demo-web --settings \
  MONGODB_URI="<mongo-uri>" \
  AZURE_STORAGE_CONNECTION_STRING="<storage-conn>" \
  JWT_SECRET="<long-random>" \
  USE_LOCAL_STORAGE=false \
  TEST_MODE=false
```

Prefer storing secrets in Key Vault and referencing them from App Service.

## 3. Deploy app

```bash
npm ci
npm run build
# zip .next + package.json + node_modules (or use Oryx build on App Service)
az webapp deploy -g rg-nexus-privacy-demo -n nexus-privacy-demo-web --src-path <artifact.zip>
```

Or connect GitHub Actions to `feat/chile-privacy-saas` / `main`.

## 4. Seed demo (once)

Against the deployed Mongo:

```bash
MONGODB_URI="..." USE_LOCAL_STORAGE=false npx tsx scripts/seed-chile-privacy-demo.ts
```

Showcase login: `demo@nexus.privacy` / `DemoCabinet2026!` → `/chile-privacy/login`

## Tenancy model

| Layer | Meaning |
|-------|---------|
| Platform | Thin admin — cabinets only |
| Cabinet | Law firm tenant |
| Client | Company in cabinet portfolio |
| Evidence | Blob path + `cabinetId`/`clientId`/`article` metadata |

## Checklist

- [ ] HTTPS only (Bicep sets `httpsOnly`)
- [ ] Blob container private
- [ ] JWT secret rotated in Key Vault
- [ ] Demo passwords changed after showcase
- [ ] `TEST_MODE=false` in production
