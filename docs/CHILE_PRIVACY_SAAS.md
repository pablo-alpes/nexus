# Nexus Privacy — Chile SaaS (lean)

Whitelabel gap assessment & management for **Ley 21.719**, aimed at law cabinets.

## Tenancy (shared Azure instance)

```
PLATFORM_ADMIN  → thin (cabinets only)
CABINET_ADMIN / CABINET_LAWYER → client portfolio
CLIENT_USER → own company (DSARs, evidence)
```

Isolation fields on data: `cabinetId`, `clientId` (+ `regulationType`).

## Gap analysis questionnaire

- **1 question per article** (66) + **literal follow-ups** where needed → **162** questions
- Choices: **Sí / No / No Aplica**
- Linked via `requirementIds` + `article` on each question
- Generator: `npm run setup:chilean-privacy-articles`

## Evidence

- Scoped by cabinet/client; optional `article` for organisation
- Azure Blob in production; local `data/evidence-local/` fallback for demos

## Demo

```bash
npm run seed:chile-demo
```

| Role | Email | Password |
|------|-------|----------|
| **Showcase (cabinet)** | `demo@nexus.privacy` | `DemoCabinet2026!` |
| Client user | `cliente@retaildemo.cl` | `DemoClient2026!` |
| Platform | `platform@nexus.privacy` | `DemoPlatform2026!` |

Login: `/chile-privacy/login`

## Azure

See `infra/azure/README.md` (Bicep: App Service + Blob + Cosmos Mongo + Key Vault).

## Branch

`feat/chile-privacy-saas` (from `feature/demo-vps-ready`)
