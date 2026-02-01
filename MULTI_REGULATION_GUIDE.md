# Multi-Regulation Support Guide

This guide explains how to extend the Nexus Cloud platform to support multiple regulations beyond DORA.

## Architecture Overview

The system has been extended with a **regulation abstraction layer** that allows the same core logic to work with different regulations. The key components are:

### 1. Regulation Configuration (`lib/regulations.ts`)

Defines regulation-specific configurations including:
- Regulation type (DORA, CHILEAN_PRIVACY, etc.)
- Pillars specific to each regulation
- Requirement and question prefixes
- Metadata (authority, effective date, etc.)

### 2. Generic Requirement Model (`models/Requirement.ts`)

A new model that supports multiple regulations:
- `regulationType`: Identifies which regulation the requirement belongs to
- `pillar`: Regulation-specific pillar ID
- Supports both ISO 27001 and ISO 27701 mappings

### 3. Internationalization (`lib/i18n.ts`)

Language support for English and Spanish:
- Translation system for UI elements
- Language toggle component
- Regulation-specific translations

## Adding a New Regulation

### Step 1: Define Regulation Configuration

Add your regulation to `lib/regulations.ts`:

```typescript
export const YOUR_REGULATION_CONFIG: RegulationConfig = {
  type: RegulationType.YOUR_REGULATION,
  name: 'Your Regulation Name',
  nameEs: 'Nombre en Español',
  description: 'Description of the regulation',
  pillars: [
    {
      id: 'PILLAR_1',
      name: 'Pillar 1 Name',
      nameEs: 'Nombre del Pilar 1',
      description: 'Pillar description',
    },
    // ... more pillars
  ],
  requirementPrefix: 'YOUR-REQ',
  questionPrefix: 'Q-YOUR',
  effectiveDate: '2025-01-01',
  authority: 'Regulatory Authority',
};
```

### Step 2: Fetch and Parse Legal Text

Create a script to fetch and parse the regulation text:

```bash
node scripts/fetch-your-regulation.js
```

This should:
1. Fetch the legal text from the source
2. Parse it into structured requirements
3. Map requirements to pillars
4. Save to `data/your-regulation-requirements.json`

### Step 3: Import Requirements

Import the structured requirements into the database:

```bash
node scripts/import-your-regulation-requirements.js
```

### Step 4: Create Questionnaire

Create a questionnaire script based on the regulation's structure:

```bash
node scripts/create-your-regulation-questionnaire.js
```

The questionnaire should:
- Cover all pillars
- Map questions to requirements
- Use appropriate question types (YES_NO, MULTIPLE_CHOICE, etc.)

### Step 5: Create Home Page

Create a regulation-specific home page at `app/your-regulation/page.tsx`:

- Use the regulation's branding colors
- Include regulation-specific messaging
- Add language toggle support
- Link to the regulation selector

### Step 6: Update Dashboard

Update the dashboard to support regulation-specific pillars:

- Modify `app/api/dashboard/kpis/route.ts` to use regulation config
- Update pillar calculations to be regulation-aware
- Add regulation selector to dashboard

## Chilean Privacy Law (Ley 21.719) Implementation

### Pillars

The Chilean Privacy Law has 8 fundamental principles (pillars):

1. **LAWFULNESS_FAIRNESS** (Licitud y Lealtad)
2. **PURPOSE_LIMITATION** (Limitación de Finalidad)
3. **DATA_MINIMIZATION** (Minimización de Datos)
4. **PROPORTIONALITY** (Proporcionalidad)
5. **QUALITY** (Calidad)
6. **ACCOUNTABILITY** (Responsabilidad)
7. **SECURITY** (Seguridad)
8. **TRANSPARENCY_CONFIDENTIALITY** (Transparencia y Confidencialidad)

### Key Compliance Requirements

- **72-hour breach notification** to the authority (APDP)
- **15 business days** to respond to data subject requests
- **Data Protection Officer (DPO)** appointment for certain controllers
- **Activity records** and security measures documentation
- **Valid legal basis** documentation (mandatory accountability)

### ISO 27701 Integration

For privacy regulations, the system can leverage ISO 27701 controls which are specifically designed for privacy management. These controls complement ISO 27001/27002 controls.

### Setup Steps

1. **Fetch the law text:**
   ```bash
   node scripts/fetch-chilean-privacy-law.js
   ```

2. **Import requirements:**
   ```bash
   node scripts/import-chilean-privacy-requirements.js
   ```

3. **Create questionnaire:**
   ```bash
   node scripts/create-chilean-privacy-questionnaire.js
   ```

4. **Access the Chilean Privacy home page:**
   Navigate to `/chilean-privacy` or use the regulation selector

## Language Support

### Using Translations

In React components:

```typescript
import { useTranslation } from '@/lib/hooks/useTranslation';

function MyComponent() {
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      <button onClick={() => setLanguage('es')}>Español</button>
    </div>
  );
}
```

### Adding New Translations

Add translations to `lib/i18n.ts`:

```typescript
export const COMMON_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'your.key': 'English text',
  },
  es: {
    'your.key': 'Texto en español',
  },
};
```

## Migration Path

### Current State

- DORA requirements use `DORARequirement` model
- Chilean Privacy requirements can be stored with `CHILE-` prefix in `DORARequirement` (temporary)
- Dashboard uses hardcoded DORA pillars

### Future State

- All requirements use the generic `Requirement` model
- Dashboard dynamically loads pillars from regulation config
- All services are regulation-agnostic

### Migration Steps

1. Migrate DORA requirements to `Requirement` model
2. Update all API routes to use `Requirement` model
3. Update dashboard to use regulation config
4. Update matching engine to be regulation-aware

## API Changes Needed

### Requirements API

Update `/api/requirements/route.ts` to:
- Accept `regulationType` query parameter
- Filter by regulation type
- Use `Requirement` model instead of `DORARequirement`

### Dashboard API

Update `/api/dashboard/kpis/route.ts` to:
- Accept `regulationType` parameter
- Load pillars from regulation config
- Calculate compliance per regulation

### Controls API

Update controls to:
- Support regulation-specific mappings
- Include ISO 27701 mappings for privacy regulations

## Testing

### Test Regulation Switching

1. Start with DORA regulation
2. Switch to Chilean Privacy
3. Verify questionnaire loads correctly
4. Verify dashboard shows correct pillars
5. Verify requirements are filtered correctly

### Test Language Switching

1. Switch to Spanish
2. Verify all UI elements are translated
3. Switch back to English
4. Verify translations persist

## Next Steps

1. **Complete ISO 27701 Integration**
   - Add ISO 27701 controls JSON file
   - Map Chilean Privacy requirements to ISO 27701
   - Update control matching logic

2. **Update Dashboard**
   - Make dashboard regulation-aware
   - Load pillars dynamically
   - Update KPI calculations

3. **Update Matching Engine**
   - Make matching engine regulation-agnostic
   - Support regulation-specific control mappings
   - Update precomputed mappings service

4. **Complete Migration**
   - Migrate all DORA requirements to `Requirement` model
   - Update all services to use generic models
   - Remove DORA-specific hardcoding

## Support

For questions or issues, refer to:
- `lib/regulations.ts` - Regulation configurations
- `lib/i18n.ts` - Translation system
- `models/Requirement.ts` - Generic requirement model
- `scripts/` - Setup and import scripts
