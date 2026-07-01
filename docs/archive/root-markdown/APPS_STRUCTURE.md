# Multi-App Structure

This document describes the separate app structure for different regulations.

## Directory Structure

```
nexus/
├── apps/
│   ├── dora-compliance/          # DORA Compliance App
│   │   ├── knowledge-base/
│   │   │   ├── dora-requirements.json
│   │   │   └── iso-controls.json
│   │   └── questionnaire/
│   │       └── dora-questions.json
│   │
│   └── chile-privacy/            # Chilean Privacy Law App
│       ├── knowledge-base/
│       │   ├── chile-requirements.json
│       │   └── relevant-controls.json
│       ├── questionnaire/
│       │   └── chile-questions.json
│       └── app/
│           └── page.tsx          # Main app page
│
└── shared/
    ├── rule-engine/              # Shared rule engine code
    ├── gap-analysis/               # Shared gap analysis logic
    └── asset-management/          # Shared asset management
```

## App Separation

### DORA Compliance App

- **Route**: `/` (root) and `/dashboard/*`
- **Knowledge Base**: `apps/dora-compliance/knowledge-base/`
- **Questionnaire**: `apps/dora-compliance/questionnaire/`
- **Branding**: Primary colors (primary-600, primary-700)
- **Pillars**: 5 DORA pillars (ICT Risk, Incident Management, etc.)

### Chilean Privacy App

- **Route**: `/chile-privacy/*`
- **Knowledge Base**: `apps/chile-privacy/knowledge-base/`
- **Questionnaire**: `apps/chile-privacy/questionnaire/`
- **Branding**: Blue colors (blue-600, blue-700)
- **Pillars**: 8 fundamental principles (Lawfulness, Purpose Limitation, etc.)

## Shared Components

### Rule Engine (`shared/rule-engine/`)
- Question-to-requirement mapping
- Control matching algorithms
- NLP similarity calculations
- Used by both apps

### Gap Analysis (`shared/gap-analysis/`)
- Gap analysis generation
- Compliance calculations
- Risk assessments
- Used by both apps

### Asset Management (`shared/asset-management/`)
- Asset models and schemas
- Criticality calculations
- Asset-to-control mapping
- Used by both apps

## Implementation Details

### Knowledge Base Files

These JSON files serve as:
1. **Reference structures** - Document the expected data format
2. **Metadata** - Store regulation-specific metadata
3. **Pointers** - Reference actual data locations

**Note**: Actual data is stored in:
- Database (MongoDB or local storage)
- `data/` directory for JSON files

### App Routing

Next.js App Router structure:
- DORA: `app/page.tsx` (root)
- Chilean Privacy: `app/chile-privacy/page.tsx` (or `apps/chile-privacy/app/page.tsx`)

### Shared Code Location

Shared code remains in:
- `lib/` - Business logic
- `models/` - Data models
- `app/api/` - API routes (can be regulation-aware)

## Benefits of This Structure

1. **Separation of Concerns**: Each regulation has its own app
2. **Independent Development**: Can develop/update apps independently
3. **Clear Organization**: Easy to find regulation-specific code
4. **Shared Logic**: Common functionality in shared directory
5. **Scalability**: Easy to add new regulation apps

## Adding a New Regulation App

1. Create directory: `apps/your-regulation/`
2. Create knowledge base: `apps/your-regulation/knowledge-base/`
3. Create questionnaire: `apps/your-regulation/questionnaire/`
4. Create app page: `apps/your-regulation/app/page.tsx`
5. Add routes in Next.js: `app/your-regulation/page.tsx`
6. Use shared components from `shared/` and `lib/`

## Current Implementation Status

✅ **Structure Created**: Directory structure in place
✅ **Knowledge Base Files**: JSON reference files created
✅ **Chilean Privacy App**: Basic app page created
✅ **Shared Directories**: README files created

🚧 **Next Steps**:
- Create separate dashboard routes for each app
- Separate API routes (or make them regulation-aware)
- Complete Chilean Privacy app implementation
- Add more shared utilities

## Notes

- The `apps/` directory structure is organizational
- Next.js routing still uses `app/` directory
- Knowledge base JSON files are references, not the actual data
- Shared code can be imported from `lib/` and `models/`
- Each app can have its own styling and branding
