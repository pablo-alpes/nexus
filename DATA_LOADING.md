# Data Loading Documentation

## Overview

This document explains how data is pre-loaded for the Chilean Privacy compliance system. The system has two main sections:

1. **Legal Compliance** - Requirements, questionnaires, controls, gap analysis, roadmap
2. **Privacy Management** - Data subject rights, consents, processing register, breach notifications, third party processors, privacy by design, data governance, data purges

## Data Loading Scripts

### 1. Legal Compliance Data

**Location:** `scripts/` directory

**Scripts:**
- `fetch-chilean-privacy-law.js` - Fetches the legal text of Ley 21.719
- `import-chilean-privacy-requirements.js` - Parses and imports legal requirements into the database
- `create-chilean-privacy-questionnaire.js` - Creates questionnaire questions linked to requirements
- `precompute-chilean-privacy-mappings.ts` - Pre-computes question-to-requirement mappings using NLP

**How to load:**
```bash
npm run setup:chilean-privacy
```

This will:
1. Fetch the Chilean Privacy Law (Ley 21.719)
2. Parse articles, incisos, and literales into hierarchical requirements
3. Create questionnaire questions
4. Pre-compute similarity mappings between questions and requirements

**Data Models:**
- `LegalRequirement` - Stores parsed legal requirements
- `Question` - Stores questionnaire questions
- `Control` - Stores ISO 27701 and ISO 27002 controls
- Precomputed mappings stored in JSON files

### 2. Privacy Management Data

**Location:** `scripts/prepopulate-privacy-data.ts`

**How to load:**
```bash
npm run prepopulate:privacy
```

Or use the automated loader:
```bash
npm run load:privacy
```

**What it creates:**
- **10 Data Subject Requests** - Various request types (access, rectification, deletion, etc.)
- **10 Consent Records** - With legal basis, justifications, and status
- **10 Processing Activities** - Detailed ROPA entries with all fields
- **10 Breach Notifications** - With workflow stages and owners
- **10 Third Party Processors** - With risk assessments and compliance status
- **10 Privacy by Design Projects** - With DPIA requirements and mitigation plans
- **10 DPIAs** - Linked to projects
- **10 Data Governance Records** - With data owners, stewards, custodians
- **5 Data Purges** - Scheduled, in-progress, completed, and pending purges

**Data Models:**
- `DataSubjectRequest`
- `Consent`
- `DataProcessingRegister`
- `BreachNotification`
- `ThirdPartyProcessor`
- `PrivacyByDesignProject`
- `DPIA`
- `DataGovernance`
- `DataPurge`

## Complete Data Loading

### Recommended: Load All Chilean Privacy Data

To load all data for Chilean Privacy (both legal compliance and privacy management):

```bash
npm run load:chilean-privacy
```

This will:
1. Load legal compliance data (requirements, questions, controls)
2. Load privacy management data (all operational records including data purges)

### Alternative: Load Separately

You can also load data separately:

**Legal Compliance only:**
```bash
npm run setup:chilean-privacy
```

**Privacy Management only:**
```bash
npm run prepopulate:privacy
```

**All data (legacy):**
```bash
npm run load:all
```

## Data Separation

### Why Two Sections?

1. **Legal Compliance** - Static reference data:
   - Legal requirements (from the law)
   - Questionnaire questions
   - ISO controls
   - Mappings between them
   - This data rarely changes and is regulation-specific

2. **Privacy Management** - Operational data:
   - Real-world records (requests, consents, breaches, etc.)
   - Business process data
   - This data changes frequently and represents actual business operations

### Data Loading Strategy

- **Legal Compliance**: Loaded once during setup, rarely updated
- **Privacy Management**: Can be loaded multiple times (script checks for duplicates)
- Both sections use the same `RegulationType.CHILEAN_PRIVACY` to filter data

## Preserving Existing Data

### Export Requirements from Database to JSON

If you have requirements in the database but the JSON file was overwritten or lost:

```bash
npm run export:requirements
```

This will export all requirements from the database back to `data/chilean-privacy-requirements.json`, preserving your parsed data.

### Export Mappings from Database to JSON

To preserve all precomputed question-to-requirement mappings:

```bash
npm run export:mappings
```

This will:
- Export all mappings to `data/chilean-privacy-mappings-backup.json`
- Create a timestamped backup file
- Preserve all NLP similarities, control-based mappings, and coherence metrics

### Export Everything

To export both requirements and mappings:

```bash
npm run export:all
```

This creates complete backups of:
- All requirements (182)
- All question-to-requirement mappings (23 mappings)
- All metadata and coherence metrics

### Import Mappings from Backup

If mappings are lost, you can restore them from the backup:

```bash
npm run import:mappings
```

This will restore all mappings from `data/chilean-privacy-mappings-backup.json` to the database.

### Data Preservation

The scripts are designed to preserve existing data:

- **fetch-chilean-privacy-law.js**: Will NOT overwrite JSON file if existing file has more requirements
- **import-chilean-privacy-requirements.js**: Uses `upsert` to avoid duplicates
- **load-all-chilean-privacy-data.ts**: Checks for existing data and skips if sufficient

## Troubleshooting

### No data in Legal Compliance section

If you don't see data in the legal compliance section (Questionnaire, Rule Engine, etc.):

1. Check if requirements exist in database:
   ```bash
   npm run export:requirements
   # This will show how many requirements are in the database
   ```

2. If database has requirements but JSON file doesn't:
   ```bash
   npm run export:requirements
   ```

3. If database is empty, run the setup script:
   ```bash
   npm run setup:chilean-privacy
   ```

4. Verify data exists:
   - Check `data/chilean-privacy-requirements.json`
   - Check `data/chilean-privacy-questionnaire.json`

### No data in Privacy Management section

If you don't see data in privacy management sections:

1. Run the prepopulation script:
   ```bash
   npm run prepopulate:privacy
   ```

2. Check for errors in the console

3. Verify data was created:
   - Check MongoDB or local storage
   - Look for documents with `regulationType: 'CHILEAN_PRIVACY'`

## Data Storage

The system supports two storage modes:

1. **MongoDB** (production) - Set `MONGODB_URI` environment variable
2. **Local Storage** (development) - Set `USE_LOCAL_STORAGE=true` or leave `MONGODB_URI` unset

Local storage uses JSON files in the `data/` directory.

## Backup Files

The following backup files are created automatically:

- `data/chilean-privacy-requirements.json` - All requirements (182)
- `data/chilean-privacy-mappings-backup.json` - All question-to-requirement mappings (23 mappings)
- `data/chilean-privacy-mappings-backup-{timestamp}.json` - Timestamped backup of mappings

These files preserve:
- All parsed requirements with hierarchical structure
- All precomputed NLP similarities
- Control-based requirement mappings
- Coherence metrics
- Rule versions

**Important:** Always backup these files before running scripts that might overwrite data!

## Next Steps

After loading data:
1. Access the dashboard at `http://localhost:3001/chile-privacy/dashboard`
2. Navigate to different sections to see the loaded data
3. Use the wizards to create new records
4. Edit existing records using the edit buttons
