# DORA Compliance App

This is the dedicated app for Digital Operational Resilience Act (DORA) compliance.

## Structure

```
apps/dora-compliance/
├── knowledge-base/
│   ├── dora-requirements.json    # Requirements metadata
│   └── iso-controls.json         # ISO controls metadata
└── questionnaire/
    └── dora-questions.json       # Questionnaire structure
```

## Knowledge Base

### Requirements
- **Source**: `data/dora-requirements-final.json`
- **Regulation**: EU DORA Regulation
- **Authority**: European Banking Authority
- **Effective Date**: January 17, 2025
- **Total Requirements**: 250+

### Controls
- **ISO 27002**: Information Security Controls
- **ISO 27005**: Risk Management
- **ISO 22301**: Business Continuity
- **ISO 27017**: Cloud Security
- **ISO 27018**: Cloud Privacy
- **ISO 31000**: Risk Management
- **ISO 20000**: IT Service Management
- **Total Controls**: 137

## Questionnaire

- **Total Questions**: 24
- **Pillars**: 5 DORA pillars
- **Question Prefix**: `Q-`
- **Language**: English

## Pillars

1. **ICT_RISK_MANAGEMENT** - ICT Risk Management
2. **INCIDENT_MANAGEMENT** - ICT-Related Incident Management
3. **RESILIENCE_TESTING** - Digital Operational Resilience Testing
4. **THIRD_PARTY_RISK** - ICT Third-Party Risk
5. **INFORMATION_SHARING** - Information Sharing Arrangements

## Routes

- `/` - Main app page (root)
- `/dashboard` - Dashboard
- `/dashboard/questionnaire` - Questionnaire
- `/login` - Login
- `/register` - Registration

## Branding

- **Primary Color**: Primary (primary-600, primary-700)
- **Name**: Nexus Cloud
- **Logo**: Primary gradient

## Shared Components

This app uses shared components from:
- `shared/rule-engine/` - Rule engine logic
- `shared/gap-analysis/` - Gap analysis logic
- `shared/asset-management/` - Asset management
- `lib/` - Business logic
- `models/` - Data models
