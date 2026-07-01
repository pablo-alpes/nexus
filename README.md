# Nexus Cloud - DORA Compliance SaaS Platform

A comprehensive SaaS platform for Digital Operational Resilience Act (DORA) compliance management, featuring an intelligent rule engine that processes ~250 legal requirements and maps them to specific controls through a dynamic questionnaire system.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Rule Engine & Core Logic](#rule-engine--core-logic)
5. [Knowledge Base: Requirements & Controls](#knowledge-base-requirements--controls)
6. [Persistency Layer](#persistency-layer)
7. [Key Features](#key-features)
8. [Getting Started](#getting-started)
9. [Future Development & Competitive Positioning](#future-development--competitive-positioning)
10. [API Documentation](#api-documentation)
11. [Project Structure](#project-structure)

---

## Overview

Nexus Cloud is a DORA compliance management platform that automates the complex process of translating legal requirements into actionable controls. The platform uses an intelligent rule engine to:

- **Process 250+ DORA legal requirements** from the EU regulation
- **Map requirements to ISO standards** (27002, 27005, 22301, 27017, 27018, 31000, 20000)
- **Dynamically filter controls** based on client-specific questionnaire responses
- **Generate gap analyses** and remediation plans
- **Track compliance** across 5 DORA pillars

### Core Value Proposition

Unlike generic compliance tools, Nexus Cloud is purpose-built for DORA with:
- **Domain-specific knowledge base** of 250+ requirements mapped to 137 ISO controls
- **Intelligent elimination/inclusion logic** that reduces control sets from hundreds to dozens
- **Automated gap analysis** that considers assets, questionnaire responses, and control mappings
- **Evidence management** with secure Azure Blob Storage integration

---

## Architecture

### Backend Architecture

The backend is built using **Next.js API Routes** (App Router), providing a unified full-stack TypeScript application.

#### Core Components

1. **API Routes** (`app/api/`)
   - RESTful endpoints for all operations
   - Authentication via JWT tokens
   - Request validation and error handling
   - Auto-setup utilities for data initialization

2. **Data Models** (`models/`)
   - Mongoose schemas with local storage fallback
   - Type-safe interfaces for all entities
   - Automatic ID conversion for local storage compatibility

3. **Business Logic** (`lib/`)
   - Rule engine services
   - Auto-import/auto-setup utilities
   - Authentication helpers
   - Azure Blob Storage integration

4. **Persistency Layer**
   - **Primary**: MongoDB with Mongoose ODM
   - **Fallback**: Local file-based storage (JSON files) for development/testing
   - Automatic fallback when MongoDB is unavailable

### Frontend Architecture

The frontend uses **Next.js App Router** with React Server Components and Client Components.

#### Core Components

1. **Dashboard Pages** (`app/dashboard/`)
   - Requirements management
   - Controls overview
   - Questionnaire wizard
   - Gap analysis visualization
   - Remediation plan management
   - Assets management

2. **UI Components**
   - TailwindCSS for styling
   - Responsive design
   - Real-time updates
   - Interactive tables and forms

3. **State Management**
   - React hooks (useState, useEffect)
   - API client utilities (`lib/api.ts`)
   - Automatic token management

---

## Technology Stack

### Backend

- **Next.js 14** (App Router)
  - API Routes for backend logic
  - Server-side rendering
  - TypeScript for type safety

- **MongoDB** with **Mongoose 8.0**
  - Document-based storage
  - Schema validation
  - Relationships and references

- **Azure Blob Storage**
  - Encrypted evidence file storage
  - Private container access
  - File upload/download APIs

- **JWT Authentication**
  - Token-based auth
  - Test mode for development
  - Secure password hashing (bcryptjs)

### Frontend

- **Next.js 14** (App Router)
  - React 18 with Server Components
  - Client-side interactivity
  - TypeScript

- **TailwindCSS 3.4**
  - Utility-first CSS
  - Responsive design
  - Custom theme configuration

- **React Hook Form**
  - Form validation
  - Type-safe form handling

### Development Tools

- **TypeScript 5.3**
- **ESLint** for code quality
- **Local Storage Adapter** for MongoDB-free development
- **Auto-setup Scripts** for data initialization

### Data Processing

- **xlsx** library for Excel parsing
- **JSON** for structured data storage
- **Custom parsers** for DORA requirements extraction

---

## Rule Engine & Core Logic

### Overview

The rule engine is the core intelligence of Nexus Cloud. It processes questionnaire responses and determines which controls are applicable based on elimination/inclusion logic.

### Rule Engine Flow

```
Questionnaire Answers
    ↓
Categorize (Yes/No/Not Applicable)
    ↓
Map "No" Answers → Requirements
    ↓
Map Requirements → Controls
    ↓
Apply Prudence Criteria (handle conflicts)
    ↓
Generate Applicable Controls Set
    ↓
Cross-reference with Assets
    ↓
Generate Gap Analysis
    ↓
Create Remediation Plan
```

### Elimination/Inclusion Logic

The rule engine uses a sophisticated elimination/inclusion algorithm:

1. **Collection Phase**
   - Collect all questionnaire answers
   - Categorize into "yes", "no", "not applicable"
   - No control calculation yet

2. **Requirement Mapping Phase**
   - **"No" answers** → Find requirements matching question keywords
   - **"Yes" answers** → Find requirements (for conflict detection)
   - Build requirement sets from each category

3. **Control Calculation Phase** (End of Questionnaire)
   - Map requirements from "no" answers → Controls
   - Use requirement-to-control mappings (logic-based, not arbitrary)
   - Handle overlapping requirements

4. **Prudence Criteria**
   - If a requirement appears in both "yes" and "no" answers → **Include the control**
   - Ensures no gaps are missed
   - Conservative approach to compliance

5. **Final Control Set**
   - Only controls needed for gaps (from "no" answers)
   - Excludes controls for capabilities already present ("yes" answers)
   - Handles conflicts with prudence

### Key Logic Files

- **`app/api/questionnaire/response/route.ts`**: End-of-questionnaire control calculation
- **`app/api/gap-analysis/route.ts`**: Gap analysis generation using rule engine results
- **`lib/services/rule-engine.ts`**: Core rule engine services
- **`app/api/remediation/route.ts`**: Remediation plan generation

### Example Flow

1. User answers 47 questions:
   - 41 "Yes" (already have these capabilities)
   - 5 "No" (gaps identified)
   - 1 "Not Applicable"

2. Rule engine:
   - Finds requirements for 5 "No" answers
   - Maps those requirements to controls
   - Applies prudence for any conflicts
   - Returns ~10-20 controls (not 65+)

3. Gap analysis:
   - Analyzes only the applicable controls
   - Cross-references with assets
   - Calculates compliance percentage

4. Remediation plan:
   - Generates actionable steps
   - Links to controls and evidence
   - Prioritizes by criticality

### Asset-to-Control Matching Logic

The gap analysis and remediation planning depend on matching assets to controls. This matching is **explicit and rule-based** to ensure transparency and predictability.

#### Matching Criteria

Assets are matched to controls based on **three criteria**:

1. **Control Type** (`TRANSVERSAL` vs `SPECIFIC`)
2. **Asset Type** (for `SPECIFIC` controls only)
3. **Criticality Level** (minimum threshold)

#### Control Types

**TRANSVERSAL Controls:**
- Apply to **all assets** regardless of asset type
- Still respect criticality level if specified
- Example: "Access Control Policy" applies to all assets

**SPECIFIC Controls:**
- Apply only to **matching asset types**
- Must match both asset type AND criticality level
- Example: "Database Encryption" only applies to `DATABASE` assets

#### Asset Types

The system supports the following asset types:
- `APPLICATION` - Software applications
- `DATABASE` - Database systems
- `NETWORK` - Network infrastructure
- `INFRASTRUCTURE` - Physical or cloud infrastructure
- `THIRD_PARTY_SERVICE` - External services
- `DATA_STORAGE` - Data storage systems
- `SECURITY_TOOL` - Security tools and systems
- `OTHER` - Other asset types

#### Criticality Levels

Assets are tiered by operational resilience criticality (1-4):
- **Level 1**: Low criticality
- **Level 2**: Medium criticality
- **Level 3**: High criticality
- **Level 4**: Critical (highest priority)

Controls can specify a `minCriticalityLevel` (1-4). An asset matches only if:
```
asset.criticalityLevel >= control.minCriticalityLevel
```

If a control has **no** `minCriticalityLevel`, it applies to all assets (within its type constraints).

#### Matching Algorithm

For each control, the system determines applicable assets using this logic:

```typescript
// TRANSVERSAL Controls
if (control.controlType === 'TRANSVERSAL') {
  if (control.minCriticalityLevel) {
    // Apply to all assets meeting criticality threshold
    return asset.criticalityLevel >= control.minCriticalityLevel;
  }
  // Apply to all assets (no criticality requirement)
  return true;
}

// SPECIFIC Controls
else if (control.controlType === 'SPECIFIC') {
  // Must match asset type
  const matchesType = control.applicableAssetTypes?.includes(asset.assetType);
  
  if (matchesType && control.minCriticalityLevel) {
    // Matches type AND meets criticality requirement
    return asset.criticalityLevel >= control.minCriticalityLevel;
  }
  // Just check type if no criticality requirement
  return matchesType;
}
```

#### Example Scenarios

**Example 1: Transversal Control with Criticality**
- **Control**: "Access Control Policy" (`TRANSVERSAL`, `minCriticalityLevel: 2`)
- **Assets**:
  - Production Database (Level 4) → ✅ **Matches** (4 >= 2)
  - Development Server (Level 1) → ❌ **Does not match** (1 < 2)

**Example 2: Specific Control with Type and Criticality**
- **Control**: "Database Encryption" (`SPECIFIC`, `applicableAssetTypes: ['DATABASE']`, `minCriticalityLevel: 3`)
- **Assets**:
  - Production Database (Level 4, `DATABASE`) → ✅ **Matches** (type matches, 4 >= 3)
  - Test Database (Level 2, `DATABASE`) → ❌ **Does not match** (type matches, but 2 < 3)
  - Web Server (Level 4, `APPLICATION`) → ❌ **Does not match** (wrong type)

**Example 3: Transversal Control without Criticality**
- **Control**: "Security Awareness Training" (`TRANSVERSAL`, no `minCriticalityLevel`)
- **Assets**: All assets → ✅ **All match** (no criticality filter)

**Example 4: Specific Control without Criticality**
- **Control**: "Application Security Testing" (`SPECIFIC`, `applicableAssetTypes: ['APPLICATION']`, no `minCriticalityLevel`)
- **Assets**:
  - Web Application (Level 1, `APPLICATION`) → ✅ **Matches**
  - Database Server (Level 4, `DATABASE`) → ❌ **Does not match** (wrong type)

#### Where Matching Happens

1. **Asset Creation** (`POST /api/assets`):
   - When creating an asset, applicable controls are automatically found
   - Controls are stored in `asset.controls` array
   - This provides immediate feedback on which controls apply

2. **Gap Analysis** (`POST /api/gap-analysis`):
   - For each applicable control (from questionnaire), finds matching assets
   - Determines control status per asset
   - Calculates compliance percentage

3. **Remediation Planning** (`POST /api/remediation`):
   - Uses same matching logic to identify affected assets
   - Lists assets in each remediation action
   - Helps prioritize remediation efforts

#### Data Flow

```
Questionnaire Response
    ↓
Applicable Controls (from elimination/inclusion logic)
    ↓
For each Control:
    ├─ Check controlType (TRANSVERSAL/SPECIFIC)
    ├─ If SPECIFIC: Check asset.assetType ∈ control.applicableAssetTypes
    └─ Check asset.criticalityLevel >= control.minCriticalityLevel
    ↓
Applicable Assets List
    ↓
Gap Analysis (control status per asset)
    ↓
Remediation Plan (actions per control-asset pair)
```

#### Best Practices for Users

1. **Asset Classification**:
   - Accurately classify assets by type (`APPLICATION`, `DATABASE`, etc.)
   - Assign appropriate criticality levels (1-4)
   - Update criticality as business context changes

2. **Control Configuration**:
   - Review control `controlType` and `applicableAssetTypes` when creating custom controls
   - Set `minCriticalityLevel` appropriately to focus on high-priority assets
   - Use `TRANSVERSAL` for controls that apply organization-wide

3. **Gap Analysis**:
   - Review which assets are affected by each control
   - Prioritize remediation for controls affecting Level 3-4 assets
   - Use asset lists in remediation plans to coordinate implementation

4. **Remediation Planning**:
   - Focus on controls affecting multiple high-criticality assets
   - Group remediation actions by asset type for efficiency
   - Track evidence per asset-control pair

#### Troubleshooting

**Issue**: Control not appearing in gap analysis for an asset
- **Check**: Asset type matches `applicableAssetTypes` (for `SPECIFIC` controls)
- **Check**: Asset criticality level >= `minCriticalityLevel`
- **Check**: Control is in the applicable set from questionnaire

**Issue**: Too many controls matched to an asset
- **Review**: Asset criticality level (lower criticality = fewer controls)
- **Review**: Control `minCriticalityLevel` settings
- **Consider**: Using `SPECIFIC` controls instead of `TRANSVERSAL` where appropriate

**Issue**: Control matched to wrong asset type
- **Check**: `applicableAssetTypes` array in control definition
- **Check**: Asset `assetType` field is correctly set
- **Update**: Control definition or asset classification as needed

---

## Gap Analysis Logic

The Gap Analysis module is the core compliance assessment engine. It analyzes which controls are implemented, partially implemented, or missing for your assets, providing a clear picture of your DORA compliance posture.

### Overview

Gap Analysis takes the applicable controls (determined by the questionnaire) and cross-references them with your assets to identify compliance gaps. It generates a comprehensive report showing:
- Which controls are fully implemented
- Which controls are partially implemented
- Which controls are not implemented (gaps)
- Which controls are not applicable to your assets
- Compliance percentage per pillar
- Priority levels for each gap

### Gap Analysis Process

The gap analysis follows a **8-step process**:

#### Step 1: Gather User Assets
- Retrieves all assets belonging to the user
- Assets are already classified by type and criticality level

#### Step 2: Get Questionnaire Response
- Retrieves the user's questionnaire response
- Extracts the `applicableControls` set (determined by elimination/inclusion logic)
- If no questionnaire exists, all controls are considered applicable

#### Step 3: Get DORA Requirements
- Retrieves all DORA requirements for the specified pillar
- Requirements are used for priority calculation and control mapping

#### Step 4: Determine Applicable Requirements
- Analyzes questionnaire answers to identify applicable requirements
- "Yes" answers may indicate requirements that are already met
- "No" answers indicate requirements that need attention
- If no questionnaire, all requirements are considered applicable

#### Step 5: Filter Controls by Questionnaire
- **Priority 1**: If questionnaire response has `applicableControls`, **strictly filter** to only those controls
- **Priority 2**: If no questionnaire controls but applicable requirements exist, filter by requirement mapping
- **Priority 3**: If no questionnaire at all, include all controls for the pillar

**Key Point**: The questionnaire response takes **absolute precedence**. If it specifies applicable controls, only those are analyzed.

#### Step 6: Analyze Each Control

For each filtered control, the system:

**6a. Find Applicable Assets**
- Uses the [Asset-to-Control Matching Logic](#asset-to-control-matching-logic)
- Filters assets based on:
  - Control type (TRANSVERSAL vs SPECIFIC)
  - Asset type matching (for SPECIFIC controls)
  - Criticality level threshold

**6b. Determine Control Status**
- **NOT_APPLICABLE**: No assets match the control criteria
- **FULLY_IMPLEMENTED**: Control has `complianceStatus: 'FULLY_COMPLIANT'` or `status: 'FULLY_IMPLEMENTED'`
- **PARTIALLY_IMPLEMENTED**: Control has `complianceStatus: 'PARTIALLY_COMPLIANT'` or `status: 'PARTIALLY_IMPLEMENTED'`
- **NOT_IMPLEMENTED**: Control has no compliance status or is marked as non-compliant

**6c. Calculate Priority**
Priority is determined by:
- **Asset Criticality**: Maximum criticality level of applicable assets
- **Requirement Compliance**: Whether linked requirements are non-compliant

Priority Levels:
- **CRITICAL**: Max criticality >= 4 OR has non-compliant requirements
- **HIGH**: Max criticality >= 3
- **MEDIUM**: Max criticality >= 2
- **LOW**: Max criticality = 1

**6d. Collect Control Metadata**
- Control title and description
- Linked requirement IDs and names
- Gap description (explains why it's a gap)

#### Step 7: Calculate Compliance Metrics

```typescript
totalControls = controlsToAnalyze.length
applicableControls = totalControls - notApplicableCount
implementedControls = fullyImplemented + (partiallyImplemented * 0.5)
compliancePercentage = (implementedControls / applicableControls) * 100
```

**Note**: `NOT_APPLICABLE` controls are excluded from compliance calculation.

#### Step 8: Generate Summary

The gap analysis includes:
- **Total Controls**: All controls analyzed
- **Applicable Controls**: Excluding NOT_APPLICABLE
- **Implemented Controls**: Fully + partially implemented
- **Compliance Percentage**: Overall compliance score
- **Gaps by Priority**: Count of gaps per priority level
- **Gaps by Status**: Count of gaps per status

### Gap Analysis Output

Each gap in the analysis contains:
- `controlId`: Unique identifier for the control
- `controlTitle`: Human-readable control name
- `controlDescription`: Detailed control description
- `requirementIds`: Array of linked DORA requirement IDs
- `requirementNames`: Array of linked DORA requirement names (for display)
- `status`: Implementation status (NOT_IMPLEMENTED, PARTIALLY_IMPLEMENTED, FULLY_IMPLEMENTED, NOT_APPLICABLE)
- `gapDescription`: Explanation of the gap
- `priority`: Priority level (LOW, MEDIUM, HIGH, CRITICAL)

### Example Gap Analysis Flow

1. **User has 15 assets** (various types, criticality 1-4)
2. **Questionnaire response** identifies **20 applicable controls** for ICT_RISK_MANAGEMENT pillar
3. **Gap Analysis**:
   - Analyzes all 20 controls
   - Finds applicable assets for each control (using matching logic)
   - Determines status:
     - 8 controls: FULLY_IMPLEMENTED
     - 3 controls: PARTIALLY_IMPLEMENTED
     - 7 controls: NOT_IMPLEMENTED (gaps)
     - 2 controls: NOT_APPLICABLE (no matching assets)
4. **Compliance Calculation**:
   - Applicable: 18 (20 - 2 NOT_APPLICABLE)
   - Implemented: 8 + (3 * 0.5) = 9.5
   - Compliance: 9.5 / 18 = **52.8%**
5. **Priority Distribution**:
   - CRITICAL: 2 gaps (affecting Level 4 assets)
   - HIGH: 3 gaps (affecting Level 3 assets)
   - MEDIUM: 2 gaps (affecting Level 2 assets)

### Best Practices

1. **Run Gap Analysis After Questionnaire**: Always complete the questionnaire first to get accurate, filtered results
2. **Review by Priority**: Start with CRITICAL and HIGH priority gaps
3. **Check Asset Matching**: Verify that controls are correctly matched to assets
4. **Update Control Status**: Manually update control compliance status as you implement controls
5. **Re-run Periodically**: Run gap analysis after implementing remediation actions to track progress

---

## Remediation Plan Logic

The Remediation Plan module transforms gap analysis results into actionable remediation steps. It provides a structured, prioritized plan for addressing compliance gaps.

### Overview

Remediation Plans take gaps identified in the Gap Analysis and convert them into:
- **Actionable remediation steps** with clear descriptions
- **Asset mapping** showing which assets need each control
- **Priority levels** for prioritization
- **Evidence suggestions** per DORA pillar
- **Status tracking** (Not Started, In Progress, Completed)
- **Progress metrics** and summary statistics

### Remediation Plan Process

The remediation plan follows a **6-step process**:

#### Step 1: Retrieve Gap Analysis
- Gets the latest gap analysis for the specified pillar
- **Requirement**: Gap analysis must exist before generating remediation plan
- If no gap analysis exists, returns an error prompting user to run gap analysis first

#### Step 2: Get User Assets
- Retrieves all user assets
- Assets are used to determine which assets need each remediation action

#### Step 3: Get Controls
- Retrieves all controls for the pillar
- Creates a control map for quick lookup by control ID

#### Step 4: Generate Remediation Actions

For each gap in the gap analysis:

**4a. Filter Gaps**
- **Skip**: `FULLY_IMPLEMENTED` gaps (no remediation needed)
- **Skip**: `NOT_APPLICABLE` gaps (not relevant)
- **Include**: `NOT_IMPLEMENTED` and `PARTIALLY_IMPLEMENTED` gaps

**4b. Find Applicable Assets**
- Uses the same [Asset-to-Control Matching Logic](#asset-to-control-matching-logic) as gap analysis
- Determines which assets need this control implemented
- Returns asset list with:
  - `assetId`: Unique asset identifier
  - `name`: Asset name
  - `criticalityLevel`: Asset criticality (1-4)

**4c. Get Evidence Suggestions**
- Retrieves pillar-specific evidence suggestions from predefined list
- Evidence suggestions vary by DORA pillar:
  - **ICT_RISK_MANAGEMENT**: Risk frameworks, assessments, registers, treatment plans
  - **INCIDENT_MANAGEMENT**: Incident policies, procedures, logs, reports, reviews
  - **RESILIENCE_TESTING**: Test schedules, results, penetration tests, vulnerability assessments
  - **THIRD_PARTY_RISK**: Risk assessments, contracts, due diligence, monitoring reports
  - **INFORMATION_SHARING**: Sharing agreements, certificates, threat intelligence

**4d. Create Remediation Action**
Each action includes:
- `controlId`: Reference to the control
- `action`: Action title (e.g., "Implement Access Control Policy")
- `description`: Detailed description from gap analysis
- `priority`: Inherited from gap analysis (LOW, MEDIUM, HIGH, CRITICAL)
- `status`: Initial status (`NOT_STARTED`)
- `dueDate`: Initially null (user can set)
- `assignedTo`: Initially null (user can assign)
- `evidenceIds`: Array of uploaded evidence references (initially empty)
- `applicableAssets`: List of assets that need this control
- `evidenceSuggestions`: Suggested evidence types for this pillar
- `controlTitle`: Control name for display
- `controlDescription`: Control description for context

#### Step 5: Create Remediation Plan

- Saves remediation plan to database with:
  - `userId`: User identifier
  - `pillar`: DORA pillar
  - `actions`: Array of all remediation actions
  - `startDate`: Current date/time
  - `targetCompletionDate`: Initially null (user can set)

#### Step 6: Format for Frontend

- Converts actions to table format with:
  - **ID**: Sequential remediation ID (RMD-0001, RMD-0002, etc.)
  - **Pillar**: DORA pillar name
  - **Control ID**: Control identifier
  - **Control Title**: Control name
  - **Control Needed**: Action description
  - **Applicable Assets**: Truncated list of asset names (50 chars max, with tooltip for full text)
  - **Asset Count**: Number of assets affected
  - **Status**: Current remediation status
  - **Priority**: Priority level
  - **Evidence Submission**: "Submitted" or "Pending" based on evidence count
  - **Evidence Count**: Number of evidence files uploaded
  - **Evidence Suggestions**: Array of suggested evidence types
  - **Comment**: Gap description
  - **Due Date**: Target completion date
  - **Assigned To**: Person responsible

### Remediation Plan Summary

The remediation plan includes summary statistics:
- **Total Actions**: Total number of remediation actions
- **Not Started**: Actions with status `NOT_STARTED`
- **In Progress**: Actions with status `IN_PROGRESS`
- **Completed**: Actions with status `COMPLETED`
- **Critical**: Number of CRITICAL priority actions
- **High**: Number of HIGH priority actions

### Remediation Status Tracking

Users can update remediation action status:
- **NOT_STARTED**: Action not yet begun
- **IN_PROGRESS**: Action is being worked on
- **COMPLETED**: Action is finished
- **BLOCKED**: Action is blocked (e.g., waiting on dependencies)

When status is updated:
- Remediation plan is saved with updated action
- Summary statistics are recalculated
- Dashboard KPIs are updated (compliance percentage, estimated max loss)

### Evidence Integration

Each remediation action can have:
- **Evidence IDs**: References to uploaded evidence files
- **Evidence Suggestions**: Recommended evidence types for the pillar
- **Evidence Submission Status**: Shows if evidence has been uploaded

Evidence can be uploaded via the Evidence Management API and linked to specific remediation actions.

### Example Remediation Plan Flow

1. **Gap Analysis** identifies 7 gaps for ICT_RISK_MANAGEMENT pillar
2. **Remediation Plan Generation**:
   - Creates 7 remediation actions (one per gap)
   - For each action:
     - Finds applicable assets (e.g., "Production Database", "Web Server")
     - Sets priority based on gap priority
     - Adds evidence suggestions (Risk Framework, Risk Assessment Reports, etc.)
3. **Action Example**:
   ```
   ID: RMD-0001
   Control: Access Control Policy
   Priority: CRITICAL
   Assets: Production Database (Level 4), Web Server (Level 3)
   Status: NOT_STARTED
   Evidence Suggestions: ICT Risk Management Framework, Risk Assessment Reports
   ```
4. **User Updates Status**:
   - Marks RMD-0001 as `IN_PROGRESS`
   - Uploads evidence: "Access Control Policy v2.0.pdf"
   - Sets due date: 2025-06-30
5. **Summary Updates**:
   - Total: 7 actions
   - Not Started: 6
   - In Progress: 1
   - Completed: 0

### Best Practices

1. **Generate After Gap Analysis**: Always run gap analysis first to ensure accurate remediation plan
2. **Prioritize by Priority**: Focus on CRITICAL and HIGH priority actions first
3. **Review Asset Lists**: Verify that the correct assets are listed for each action
4. **Set Due Dates**: Assign realistic due dates based on priority and complexity
5. **Assign Ownership**: Assign actions to team members for accountability
6. **Upload Evidence**: Upload evidence as you complete actions to track progress
7. **Update Status Regularly**: Keep status current to maintain accurate compliance metrics
8. **Re-generate Periodically**: Re-generate remediation plan after implementing actions to see remaining gaps

### Integration with Dashboard

Remediation plan status affects:
- **Compliance Percentage**: Completed actions increase compliance
- **Estimated Max Loss**: Based on asset criticality and gap status
- **Pillar Compliance**: Per-pillar compliance considers remediation progress

---

## Knowledge Base: Requirements & Controls

### DORA Requirements

**Source**: Excel file (`DORA_Gap_Assessment_Template_v1.1.xlsx`) containing ~250 legal requirements

**Processing**:
1. Excel parsed using `xlsx` library
2. Structured into JSON format (`data/dora-requirements-final.json`)
3. Each requirement includes:
   - Requirement ID (DORA-REQ-XXX)
   - Title and description
   - Legal text
   - Pillar assignment (5 DORA pillars)
   - Compliance status
   - ISO 27001 mappings

**Auto-Import**: Requirements automatically imported on first access or health check

### ISO Controls Knowledge Base

**Source**: Static JSON file (`data/iso27002-controls.json`)

**Standards Included**:
- **ISO 27002:2022** (Information Security Controls)
- **ISO 27005:2022** (Risk Management)
- **ISO 22301:2019** (Business Continuity)
- **ISO 27017:2015** (Cloud Security)
- **ISO 27018:2019** (Cloud Privacy)
- **ISO 31000:2018** (Risk Management)
- **ISO 20000-1:2018** (IT Service Management)

**Total Controls**: 137 controls mapped to DORA requirements

**Control Structure**:
```json
{
  "controlId": "ISO-5.1",
  "title": "Policies for information security",
  "description": "A set of policies for information security...",
  "category": "ORGANIZATIONAL",
  "pillar": "ICT_RISK_MANAGEMENT",
  "doraRequirements": ["DORA-REQ-001", "DORA-REQ-002"],
  "controlType": "TRANSVERSAL",
  "minCriticalityLevel": 1,
  "iso27005Mapping": "..."
}
```

**Mapping Logic**:
- Controls manually mapped to DORA requirements in static JSON
- Each control can map to multiple requirements
- Fallback: Controls map to pillar if specific requirements not defined
- Auto-creation: Controls created from JSON on first access

### Question-Requirement-Control Mapping

**Questions** (`models/Question.ts`):
- 24 unique questions (one per DORA pillar)
- Each question has options (Yes/No/Not Applicable)
- Options can have `applicableControls` mapped (requirement IDs)

**Mapping Flow**:
1. Question answered "No" → Find requirements matching question keywords
2. Requirements → Find controls that map to those requirements
3. Controls included in applicable set

**Auto-Mapping** (`lib/auto-controls.ts`):
- `updateQuestionsWithControls()`: Maps questions to controls via requirements
- Uses keyword matching to find relevant requirements
- Creates bidirectional relationships

---

## Persistency Layer

### Architecture

Nexus Cloud uses a **dual-storage architecture** for maximum flexibility:

1. **Production**: MongoDB with Mongoose ODM
2. **Development/Testing**: Local file-based storage (JSON files)

### MongoDB (Production)

**Connection**: `lib/mongodb.ts`
- Mongoose connection pooling
- Automatic reconnection
- Environment-based configuration

**Models**: All models in `models/` directory
- Mongoose schemas with validation
- TypeScript interfaces
- Relationships via ObjectId references

### Local Storage (Development)

**Implementation**: `lib/local-storage.ts`

**Features**:
- File-based storage in `data/local-db/`
- MongoDB-style query API
- Supports `$in` queries on arrays
- Automatic ID conversion (ObjectId ↔ string)
- Sorting and filtering

**Models**: `models/LocalModel.ts`
- Wrapper around LocalStorage class
- Same API as Mongoose models
- Automatic fallback when MongoDB unavailable

**Connection Adapter**: `lib/mongodb-local.ts`
- Attempts MongoDB connection first
- Falls back to local storage automatically
- Transparent to application code

### Data Files

**Local Database** (`data/local-db/`):
- `DORARequirement.json` - DORA requirements
- `Control.json` - ISO controls
- `Question.json` - Questionnaire questions
- `QuestionnaireResponse.json` - User responses
- `Asset.json` - User assets
- `GapAnalysis.json` - Gap analyses
- `RemediationPlan.json` - Remediation plans

**Static Data** (`data/`):
- `dora-requirements-final.json` - Structured DORA requirements
- `iso27002-controls.json` - ISO controls knowledge base
- `iso27001-mappings.json` - ISO 27001 cross-references

### Auto-Setup System

**Purpose**: Automatically initialize data on first run

**Components**:
- `lib/auto-import.ts`: Imports DORA requirements from JSON
- `lib/auto-setup.ts`: Creates mock assets
- `lib/auto-questionnaire.ts`: Creates questionnaire questions
- `lib/auto-controls.ts`: Creates controls from ISO standards
- `lib/auto-questionnaire-response.ts`: Creates mock responses

**Trigger**: Health check endpoint (`/api/health`) or first API access

---

## Key Features

### 1. Intelligent Questionnaire System

- **24 unique questions** across 5 DORA pillars
- **Yes/No/Not Applicable** answers
- **Automatic control filtering** based on responses
- **Results view** showing answers by pillar
- **Clear button** to reset all responses

### 2. Elimination/Inclusion Rule Engine

- **End-of-questionnaire calculation** (not per-question)
- **"No" answers** → Include controls (gaps identified)
- **"Yes" answers** → Exclude controls (already have)
- **Prudence criteria** for conflicting requirements
- **Logic-based mapping** (no arbitrary limits)

### 3. Gap Analysis

- **Automated gap detection** per DORA pillar
- **Cross-references**: Assets + Questionnaire + Requirements + Controls
- **Compliance percentage** calculation
- **Priority assignment** based on asset criticality
- **Control details** with linked requirements

### 4. Remediation Plans

- **Actionable remediation steps** from gap analysis
- **Evidence suggestions** per pillar
- **Asset mapping** (which assets need the control)
- **Status tracking** (Not Started, In Progress, Completed)
- **Priority and due dates**
- **Evidence upload** integration

### 5. Asset Management

- **Tiered by criticality** (Level 1-4)
- **Asset types** (Infrastructure, Applications, Data, etc.)
- **Automatic control mapping** based on type and criticality
- **Transversal vs Specific** control assignment

### 6. Dashboard KPIs

- **Overall compliance percentage**
- **Compliance per pillar**
- **Estimated maximum loss** (based on asset criticality and gaps)
- **Total assets** and **gap analyses**
- **Auto-refresh** on tab visibility

### 7. Evidence Management

- **Secure upload** to Azure Blob Storage
- **Encryption** before storage
- **Link to requirements/controls**
- **Compliance status** tagging
- **File type validation**

### 8. ISO Standards Integration

- **137 controls** from 7 ISO standards
- **Cross-reference** DORA requirements with ISO controls
- **Relevance levels** (High, Medium, Low)
- **Automatic mapping** on control creation

---

## Getting Started

### Quick Demo (single command)

From the `nexus/` folder:

```bash
npm run demo:all-in-one
```

This command:
- resets local demo DB
- seeds deterministic mock data
- fixes DORA pillar assignment
- recomputes mappings
- builds and starts HTTPS locally

### VPS Quick Start (simple)

On your VPS, inside the `nexus/` folder:

```bash
npm install
npm run vps:bootstrap
```

This command:
- prepares demo/runtime data
- builds the app
- starts it with PM2

Important:
- For a public production domain, keep app behind **Nginx + Let's Encrypt**.
- The built-in script is sufficient to run the app process, but TLS termination should be done by Nginx in VPS production.

### Prerequisites

- **Node.js 18+**
- **MongoDB** (optional - local storage fallback available)
- **Azure Storage Account** (for evidence files - optional for testing)
- **npm** or **yarn**

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd Nexus_Cloud
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# MongoDB (optional - will use local storage if not provided)
MONGODB_URI=mongodb://localhost:27017/dora_compliance

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=30d

# Azure Blob Storage (optional - for evidence files)
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string
AZURE_STORAGE_CONTAINER_NAME=dora-evidence

# Encryption (for evidence files)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Test Mode (bypasses authentication)
TEST_MODE=true
```

4. **Run development server**:
```bash
npm run dev
```

5. **Access the application**:
- Open [http://localhost:3000](http://localhost:3000)
- Use "Quick Test Login" button (if TEST_MODE=true)
- Or register/login normally

### Auto-Setup

On first run, the application automatically:
- Imports DORA requirements from JSON
- Creates ISO controls from static data
- Creates questionnaire questions
- Sets up mock assets (for testing)
- Creates mock questionnaire response (for testing)

**Trigger**: Access `/api/health` or any dashboard page

### Manual Setup (Optional)

```bash
# Parse Excel to JSON (one-time)
npm run setup

# Create mock assets
npm run setup:assets

# Create questionnaire
npm run setup:questionnaire
```

---

## Future Development & Competitive Positioning

### Current State

Nexus Cloud is a **purpose-built DORA compliance platform** with:

✅ **Core Features**:
- Rule engine for 250+ requirements
- Questionnaire-based control filtering
- Gap analysis and remediation planning
- Evidence management
- ISO standards integration

✅ **Technical Foundation**:
- Modern stack (Next.js 14, TypeScript, MongoDB)
- Flexible persistence layer (MongoDB + local storage)
- Auto-setup system for easy onboarding
- Test mode for development

### Competitive Advantages vs OneTrust & Formalize

#### 1. **Domain-Specific Focus**
- **Nexus Cloud**: Purpose-built for DORA with deep domain knowledge
- **OneTrust/Formalize**: Generic compliance platforms requiring extensive configuration

#### 2. **Intelligent Rule Engine**
- **Nexus Cloud**: Elimination/inclusion logic reduces control sets intelligently
- **OneTrust/Formalize**: Manual control selection or broad rule sets

#### 3. **Knowledge Base**
- **Nexus Cloud**: Pre-mapped 250+ DORA requirements to 137 ISO controls
- **OneTrust/Formalize**: Requires manual mapping and configuration

#### 4. **Questionnaire Intelligence**
- **Nexus Cloud**: End-of-questionnaire calculation with prudence criteria
- **OneTrust/Formalize**: Linear question flow without intelligent aggregation

#### 5. **Cost Structure**
- **Nexus Cloud**: Open-source foundation, predictable pricing model
- **OneTrust/Formalize**: Enterprise pricing, complex licensing

### Roadmap for Competitive Parity

#### Phase 1: Enhanced Features (Current → 3 months)

1. **Advanced Reporting**
   - Executive dashboards
   - Compliance reports (PDF export)
   - Trend analysis over time
   - Custom report builder

2. **Workflow Automation**
   - Automated remediation task assignment
   - Email notifications
   - Approval workflows
   - SLA tracking

3. **Multi-Tenancy**
   - Organization management
   - Role-based access control (RBAC)
   - User management
   - Audit logs

#### Phase 2: Enterprise Features (3-6 months)

4. **Integration Hub**
   - REST API for third-party integrations
   - Webhook support
   - SIEM integration (Splunk, QRadar)
   - GRC tool integration

5. **Advanced Analytics**
   - Machine learning for risk prediction
   - Anomaly detection
   - Compliance scoring algorithms
   - Benchmarking against industry

6. **Collaboration Features**
   - Team workspaces
   - Comments and discussions
   - Document collaboration
   - Task management

#### Phase 3: Market Leadership (6-12 months)

7. **AI-Powered Features**
   - Natural language requirement interpretation
   - Automated control suggestions
   - Intelligent evidence matching
   - Predictive compliance analytics

8. **Regulatory Expansion**
   - Support for other regulations (GDPR, NIS2, etc.)
   - Multi-regulation compliance
   - Regulatory change tracking
   - Cross-regulation mapping

9. **Enterprise Scale**
   - High availability (HA) deployment
   - Horizontal scaling
   - Performance optimization
   - Enterprise SSO (SAML, OAuth)

10. **Marketplace & Ecosystem**
    - Plugin architecture
    - Third-party integrations marketplace
    - Custom control libraries
    - Community contributions

### Technical Debt & Improvements

#### Immediate (1-2 months)
- [ ] Add comprehensive unit tests
- [ ] Improve error handling and logging
- [ ] Add API rate limiting
- [ ] Enhance security (input validation, SQL injection prevention)

#### Short-term (3-6 months)
- [ ] Migrate to microservices architecture (if needed for scale)
- [ ] Add caching layer (Redis)
- [ ] Implement real-time updates (WebSockets)
- [ ] Add comprehensive API documentation (OpenAPI/Swagger)

#### Long-term (6-12 months)
- [ ] GraphQL API option
- [ ] Event-driven architecture
- [ ] Advanced monitoring and observability
- [ ] Performance optimization and load testing

### Differentiation Strategy

**Nexus Cloud's unique value proposition**:

1. **DORA-First Approach**: Deep domain expertise vs generic platforms
2. **Intelligent Automation**: Rule engine reduces manual work by 70%+
3. **Transparent Logic**: Open-source foundation, auditable algorithms
4. **Cost Efficiency**: Predictable pricing vs enterprise complexity
5. **Rapid Deployment**: Auto-setup gets clients running in minutes

---

## API Documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/test-login` - Quick test login (TEST_MODE only)

### Requirements

- `GET /api/requirements` - Get all requirements (filtered by pillar)
- `GET /api/requirements/import-json` - Import from JSON file
- `POST /api/requirements` - Import from Excel
- `PUT /api/requirements/[requirementId]/compliance` - Update compliance status

### Controls

- `GET /api/controls` - Get all controls (filtered by pillar)
- `POST /api/controls` - Create/update control
- `PUT /api/controls/[controlId]/compliance` - Update compliance status

### Questionnaire

- `GET /api/questionnaire/questions` - Get all questions
- `GET /api/questionnaire/response` - Get user's response
- `POST /api/questionnaire/response` - Submit questionnaire (triggers rule engine)
- `DELETE /api/questionnaire/response` - Clear all responses

### Gap Analysis

- `GET /api/gap-analysis` - Get gap analyses
- `POST /api/gap-analysis` - Generate gap analysis (uses rule engine results)

### Remediation

- `GET /api/remediation` - Get remediation plans (filtered by pillar)
- `POST /api/remediation` - Generate remediation plan from gap analysis
- `PUT /api/remediation` - Update remediation action status

### Assets

- `GET /api/assets` - Get user's assets
- `POST /api/assets` - Create asset
- `PUT /api/assets/[assetId]` - Update asset

### Evidence

- `GET /api/evidence` - Get evidence list
- `POST /api/evidence/upload` - Upload evidence (encrypted)
- `GET /api/evidence/[evidenceId]` - Download evidence
- `DELETE /api/evidence/[evidenceId]` - Delete evidence

### Dashboard

- `GET /api/dashboard/kpis` - Get dashboard KPIs (compliance, assets, etc.)

### Health

- `GET /api/health` - Health check (triggers auto-setup)

---

## Project Structure

```
Nexus_Cloud/
├── app/
│   ├── api/                    # Next.js API Routes
│   │   ├── auth/               # Authentication
│   │   ├── assets/             # Asset management
│   │   ├── controls/           # Control management
│   │   ├── dashboard/          # Dashboard KPIs
│   │   ├── evidence/           # Evidence upload/download
│   │   ├── gap-analysis/      # Gap analysis generation
│   │   ├── health/             # Health check & auto-setup
│   │   ├── iso27001/           # ISO 27001 suggestions
│   │   ├── questionnaire/      # Questionnaire & rule engine
│   │   ├── remediation/        # Remediation plans
│   │   └── requirements/       # DORA requirements
│   ├── dashboard/              # Dashboard pages
│   │   ├── assets/            # Asset management UI
│   │   ├── controls/          # Controls overview
│   │   ├── gap-analysis/      # Gap analysis visualization
│   │   ├── questionnaire/     # Questionnaire wizard
│   │   ├── remediation/       # Remediation plan UI
│   │   ├── requirements/      # Requirements management
│   │   └── page.tsx           # Main dashboard
│   ├── login/                 # Login page
│   ├── register/              # Registration page
│   └── page.tsx               # Landing page
├── data/                      # Data files
│   ├── local-db/              # Local storage (JSON files)
│   │   ├── Asset.json
│   │   ├── Control.json
│   │   ├── DORARequirement.json
│   │   ├── GapAnalysis.json
│   │   ├── Question.json
│   │   ├── QuestionnaireResponse.json
│   │   └── RemediationPlan.json
│   ├── dora-requirements-final.json  # Structured DORA requirements
│   ├── iso27002-controls.json        # ISO controls knowledge base
│   └── iso27001-mappings.json       # ISO 27001 cross-references
├── lib/                       # Business logic & utilities
│   ├── api.ts                 # Frontend API client
│   ├── auth.ts                # JWT authentication
│   ├── auth-helper.ts         # Auth helper (test mode support)
│   ├── auto-controls.ts       # Auto-create controls from ISO
│   ├── auto-import.ts         # Auto-import requirements
│   ├── auto-questionnaire.ts  # Auto-create questions
│   ├── auto-questionnaire-response.ts  # Mock responses
│   ├── auto-setup.ts          # Auto-create mock assets
│   ├── azure-storage.ts       # Azure Blob Storage client
│   ├── local-storage.ts       # Local file-based storage
│   ├── mongodb-local.ts       # MongoDB with local fallback
│   ├── mongodb.ts             # MongoDB connection
│   ├── services/
│   │   └── rule-engine.ts     # Core rule engine logic
│   └── test-mode.ts           # Test mode utilities
├── models/                    # Data models
│   ├── Asset.ts               # Asset model
│   ├── Control.ts             # Control model
│   ├── DORARequirement.ts     # DORA requirement model
│   ├── Evidence.ts            # Evidence model
│   ├── GapAnalysis.ts         # Gap analysis model
│   ├── LocalModel.ts          # Local storage model wrapper
│   ├── Question.ts            # Question model
│   ├── QuestionnaireResponse.ts  # Response model
│   ├── RemediationPlan.ts     # Remediation plan model
│   └── User.ts                # User model
├── scripts/                   # Utility scripts
│   ├── parse-dora-final.js   # Excel to JSON parser
│   ├── create-mock-assets.ts # Mock asset generator
│   ├── create-dora-questionnaire.ts  # Question generator
│   ├── map-iso-to-dora.js     # ISO to DORA mapper
│   └── test-*.js              # Integration tests
├── middleware.ts              # Next.js middleware (auth)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.js         # TailwindCSS config
└── README.md                  # This file
```

---

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Testing

**Local Storage Mode** (no MongoDB required):
- Set `TEST_MODE=true` in `.env`
- Use "Quick Test Login" button
- Data stored in `data/local-db/` as JSON files

**Integration Tests**:
```bash
node scripts/test-full-flow.js
node scripts/test-gap-analysis.js
node scripts/test-questionnaire-response.js
```

### Code Quality

```bash
npm run lint
```

---

## Security Features

- **Encryption**: All evidence files encrypted before Azure Blob Storage upload
- **Authentication**: JWT-based authentication with secure token storage
- **Authorization**: User-scoped data access (all queries filtered by userId)
- **File Validation**: File type and size restrictions
- **Secure Storage**: Azure Blob Storage with private container access
- **Input Validation**: TypeScript types + runtime validation

---

## License

[Your License Here]

---

## Support

For support, email [your-email] or create an issue in the repository.

---

## Acknowledgments

- DORA regulation (EU 2022/2554)
- ISO 27002:2022, ISO 27005:2022, ISO 22301:2019, ISO 27017:2015, ISO 27018:2019, ISO 31000:2018, ISO 20000-1:2018
