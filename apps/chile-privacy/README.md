# Chilean Privacy Law App (Ley 21.719)

This is the dedicated app for Chilean Personal Data Protection Law compliance, separate from the DORA compliance app.

## Structure

```
apps/chile-privacy/
├── knowledge-base/
│   ├── chile-requirements.json    # Requirements metadata
│   └── relevant-controls.json     # ISO 27701 controls metadata
├── questionnaire/
│   └── chile-questions.json       # Questionnaire structure
└── app/
    └── page.tsx                    # Main app page
```

## Knowledge Base

### Requirements
- **Source**: `data/chilean-privacy-requirements.json`
- **Regulation**: Ley 21.719 - Protección de Datos Personales
- **Authority**: Agencia de Protección de Datos Personales (APDP)
- **Effective Date**: December 1, 2026

### Controls
- **ISO 27701**: Privacy-specific controls
- **ISO 27001/27002**: Security controls relevant to privacy

## Questionnaire

- **Total Questions**: 24+
- **Pillars**: 8 fundamental principles
- **Question Prefix**: `Q-PRIV-`
- **Language**: Spanish/English

## Pillars

1. **LAWFULNESS_FAIRNESS** (Licitud y Lealtad)
2. **PURPOSE_LIMITATION** (Limitación de Finalidad)
3. **DATA_MINIMIZATION** (Minimización de Datos)
4. **PROPORTIONALITY** (Proporcionalidad)
5. **QUALITY** (Calidad)
6. **ACCOUNTABILITY** (Responsabilidad)
7. **SECURITY** (Seguridad)
8. **TRANSPARENCY_CONFIDENTIALITY** (Transparencia y Confidencialidad)

## Setup

1. Fetch requirements:
   ```bash
   node scripts/fetch-chilean-privacy-law.js
   ```

2. Import requirements:
   ```bash
   node scripts/import-chilean-privacy-requirements.js
   ```

3. Create questionnaire:
   ```bash
   node scripts/create-chilean-privacy-questionnaire.js
   ```

## Routes

- `/chile-privacy` - Main app page
- `/chile-privacy/dashboard` - Dashboard (to be created)
- `/chile-privacy/questionnaire` - Questionnaire (to be created)
- `/chile-privacy/login` - Login (to be created)
- `/chile-privacy/register` - Registration (to be created)

## Branding

- **Primary Color**: Blue (blue-600, blue-700)
- **Name**: Nexus Privacy
- **Logo**: Blue gradient

## Shared Components

This app uses shared components from:
- `shared/rule-engine/` - Rule engine logic
- `shared/gap-analysis/` - Gap analysis logic
- `shared/asset-management/` - Asset management
- `lib/` - Business logic
- `models/` - Data models
