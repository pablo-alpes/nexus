# Nexus Cloud Rule Engine - Complete Workflow Diagram

## Overview

The Rule Engine is the core intelligence of Nexus Cloud. It processes questionnaire responses and automatically determines which controls are applicable, reducing the control set from hundreds to dozens.

---

## Complete Rule Engine Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INPUTS TO RULE ENGINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   QUESTIONNAIRE      │  │   KNOWLEDGE BASE     │  │   USER ASSETS        │
│   RESPONSES          │  │                      │  │                      │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ • 24 Questions       │  │ • 250+ DORA          │  │ • Asset Inventory    │
│ • Answers:           │  │   Requirements       │  │ • Asset Types:       │
│   - Yes (41)         │  │ • 137 ISO Controls   │  │   - APPLICATION      │
│   - No (5)           │  │ • Pre-mapped:        │  │   - DATABASE         │
│   - Not Applicable(1)│  │   Requirements →     │  │   - NETWORK          │
│ • Pillar Assignment  │  │   Controls           │  │   - INFRASTRUCTURE   │
│ • Question Keywords  │  │ • Control Types:     │  │ • Criticality:      │
│                      │  │   - TRANSVERSAL      │  │   - Level 1 (Low)     │
│                      │  │   - SPECIFIC         │  │   - Level 2 (Medium)  │
│                      │  │ • Requirement IDs    │  │   - Level 3 (High)    │
│                      │  │   per Control        │  │   - Level 4 (Critical) │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                         │
           └─────────────┬────────────┴─────────────┬─────────────┘
                         │                         │
                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: ANSWER COLLECTION                                │
│              (End-of-Questionnaire - Not Per-Question)                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  Collect ALL Answers │
                    │  (Aggregate First)   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │  NO ANSWERS   │  │  YES ANSWERS  │  │ NOT APPLICABLE│
    │  (Gaps)       │  │  (Have it)    │  │  (Skip)       │
    │  Count: 5     │  │  Count: 41    │  │  Count: 1     │
    └───────┬───────┘  └───────┬───────┘  └───────────────┘
            │                  │
            │                  │
            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              PHASE 2: REQUIREMENT MAPPING                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────┐
    │  Process "NO" Answers (Gaps)          │
    │  For each "NO" answer:                │
    │  1. Extract question keywords         │
    │  2. Match with DORA requirements     │
    │  3. Check question.options mappings   │
    └───────────────┬───────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Requirements from "NO" Answers        │
    │  Set: {REQ-045, REQ-046, REQ-123,     │
    │        REQ-178, REQ-201...}           │
    │  (These indicate gaps)                │
    └───────────────┬───────────────────────┘

    ┌───────────────────────────────────────┐
    │  Process "YES" Answers                │
    │  (For Conflict Detection Only)        │
    │  For each "YES" answer:               │
    │  1. Extract question keywords         │
    │  2. Match with DORA requirements     │
    └───────────────┬───────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Requirements from "YES" Answers       │
    │  Set: {REQ-012, REQ-045, REQ-078,     │
    │        REQ-134, REQ-201...}           │
    │  (These indicate capabilities exist)  │
    └───────────────┬───────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              PHASE 3: CONTROL CALCULATION                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────┐
    │  Map Requirements → Controls          │
    │  Find Controls where:                 │
    │  control.requirementIds ∩              │
    │  requirementsFromNoAnswers ≠ ∅        │
    └───────────────┬───────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Initial Applicable Controls          │
    │  Set: {ISO-5.1, ISO-5.2, ISO-6.1,    │
    │        ISO-7.3, ISO-8.1...}          │
    │  (From "NO" answers - gaps)           │
    │  Count: ~12 controls                  │
    └───────────────┬───────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              PHASE 4: PRUDENCE CRITERIA                                      │
│                    (Conflict Resolution)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────┐
    │  Detect Conflicts                      │
    │  conflictingRequirements =             │
    │    requirementsFromNoAnswers ∩         │
    │    requirementsFromYesAnswers          │
    │                                        │
    │  Example: REQ-045, REQ-201 in both    │
    └───────────────┬───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼ YES                   ▼ NO
    ┌──────────┐          ┌──────────┐
    │ INCLUDE  │          │ SKIP     │
    │ Control  │          │ (No      │
    │ (Prudence│          │ conflict)│
    │ Criteria)│          │          │
    └────┬─────┘          └────┬─────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Final Applicable Controls Set        │
    │  {ISO-5.1, ISO-5.2, ISO-6.1,         │
    │   ISO-7.3, ISO-8.1, ISO-9.2...}      │
    │  (10-20 controls, not 65+)            │
    │                                        │
    │  Reasoning Tracked:                    │
    │  - Question → Requirement → Control   │
    │  - Prudence criteria applied          │
    └───────────────┬───────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              PHASE 5: ASSET-TO-CONTROL MATCHING                              │
│                    (Gap Analysis)                                            │
└─────────────────────────────────────────────────────────────────────────────┘

    For each applicable control:
    ┌───────────────────────────────────────┐
    │  Check Control Type                    │
    │  ┌─────────────────┐  ┌──────────────┐ │
    │  │ TRANSVERSAL    │  │ SPECIFIC     │ │
    │  │ (All assets)   │  │ (Type match) │ │
    │  └────────┬───────┘  └──────┬───────┘ │
    │           │                 │          │
    │           ▼                 ▼          │
    │  ┌──────────────────────────────────┐  │
    │  │ Check Criticality Level          │  │
    │  │ asset.criticalityLevel >=        │  │
    │  │ control.minCriticalityLevel      │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │                 ▼                       │
    │  ┌──────────────────────────────────┐  │
    │  │ Find Applicable Assets            │  │
    │  │ Example: 3 assets match           │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │                 ▼                       │
    │  ┌──────────────────────────────────┐  │
    │  │ Determine Control Status          │  │
    │  │ - NOT_APPLICABLE (no assets)     │  │
    │  │ - NOT_IMPLEMENTED (gap)         │  │
    │  │ - PARTIALLY_IMPLEMENTED          │  │
    │  │ - FULLY_IMPLEMENTED              │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │                 ▼                       │
    │  ┌──────────────────────────────────┐  │
    │  │ Calculate Priority                 │  │
    │  │ Based on max asset criticality     │  │
    │  │ CRITICAL/HIGH/MEDIUM/LOW          │  │
    │  └──────────────────────────────────┘  │
    └─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OUTPUTS FROM RULE ENGINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  Applicable Controls│
                    │  (Reduced Set)      │
                    │  10-20 controls     │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │  GAP ANALYSIS │  │  REMEDIATION   │  │  STRATEGIC    │
    │               │  │  PLAN          │  │  RECOMMEND.   │
    ├───────────────┤  ├───────────────┤  ├───────────────┤
    │ Output:       │  │ Output:       │  │ Output:       │
    │ • 7 Gaps      │  │ • 7 Actions   │  │ • €180K      │
    │ • Compliance: │  │ • Asset Lists │  │   Investment  │
    │   52%         │  │ • Evidence    │  │ • 3 Phases    │
    │ • By Priority │  │   Suggestions │  │ • ROI: 3.2x   │
    │ • Reasoning   │  │ • Status     │  │ • Quick Wins │
    │   per Control │  │   Tracking   │  │ • Resources   │
    └───────────────┘  └───────────────┘  └───────────────┘
```

---

## Detailed Processing Steps

### Phase 1: Answer Collection
```
Input: 24 questionnaire answers
Processing: Categorize all answers (not per-question)
Output: 
  - noAnswers: 5 (gaps)
  - yesAnswers: 41 (have it)
  - notApplicable: 1 (skip)
```

### Phase 2: Requirement Mapping

#### For "NO" Answers (Gaps):
```
Input: 5 "NO" answers
Processing:
  1. Extract keywords from each question
  2. Match keywords with DORA requirements
  3. Check question.options for direct mappings
Output: requirementsFromNoAnswers = {REQ-045, REQ-046, REQ-123, REQ-178, REQ-201}
```

#### For "YES" Answers (Conflict Detection):
```
Input: 41 "YES" answers
Processing:
  1. Extract keywords from each question
  2. Match keywords with DORA requirements
Output: requirementsFromYesAnswers = {REQ-012, REQ-045, REQ-078, REQ-134, REQ-201}
(Note: REQ-045 and REQ-201 appear in both - conflicts!)
```

### Phase 3: Control Calculation
```
Input: requirementsFromNoAnswers = {REQ-045, REQ-046, REQ-123, REQ-178, REQ-201}
Processing:
  1. Find controls where control.requirementIds contains any of these
  2. Also search by pillar for controls
Output: Initial controls = {ISO-5.1, ISO-5.2, ISO-6.1, ISO-7.3, ISO-8.1, ISO-9.2}
```

### Phase 4: Prudence Criteria
```
Input: 
  - requirementsFromNoAnswers = {REQ-045, REQ-201}
  - requirementsFromYesAnswers = {REQ-045, REQ-201}
Processing:
  1. Detect conflicts: REQ-045 and REQ-201 in both sets
  2. Include controls for conflicting requirements anyway
  3. Track reasoning: "Included via prudence criteria"
Output: 
  - Add controls for REQ-045 and REQ-201
  - Final set: {ISO-5.1, ISO-5.2, ISO-6.1, ISO-7.3, ISO-8.1, ISO-9.2, ISO-10.1}
  - Total: 10-20 controls (reduced from 65+)
```

### Phase 5: Asset Matching
```
For each control:
  IF controlType = "TRANSVERSAL":
    IF minCriticalityLevel exists:
      Match assets where criticalityLevel >= minCriticalityLevel
    ELSE:
      Match all assets
  ELSE IF controlType = "SPECIFIC":
    Match assets where:
      - assetType ∈ control.applicableAssetTypes
      - criticalityLevel >= minCriticalityLevel (if specified)
  
Output: For each control, list of applicable assets
```

### Phase 6: Gap Analysis
```
For each control:
  1. Find applicable assets (from Phase 5)
  2. Check control status (NOT_IMPLEMENTED, PARTIALLY, FULLY, NOT_APPLICABLE)
  3. Calculate priority (based on max asset criticality)
  4. Generate gap description
  5. Include reasoning (why control was included)

Output:
  - Gap analysis with 7 gaps
  - Compliance percentage: 52%
  - Gaps by priority: 2 CRITICAL, 3 HIGH, 2 MEDIUM
  - Reasoning for each control
```

### Phase 7: Remediation Plan
```
For each gap:
  1. Find applicable assets
  2. Get evidence suggestions (pillar-specific)
  3. Create remediation action:
     - Control ID and title
     - Description
     - Priority (inherited)
     - Applicable assets list
     - Evidence suggestions
     - Status: NOT_STARTED

Output:
  - 7 remediation actions
  - Asset mapping for each
  - Evidence suggestions
```

### Phase 8: Strategic Recommendations
```
For remediation actions:
  1. Estimate costs (control type, asset type, priority, criticality)
  2. Calculate ROI (risk reduction vs investment)
  3. Create phased approach:
     - Phase 1: Quick wins (low effort, high impact)
     - Phase 2: Critical gaps (high priority)
     - Phase 3: Remaining controls
  4. Resource allocation (team assignments, hours, costs)

Output:
  - Total investment: €180K
  - ROI: 3.2x
  - 3-phase approach
  - Resource allocation per team
  - Quick wins identified
```

---

## Key Algorithms

### 1. Elimination/Inclusion Logic

```
IF answer = "NO":
    → Find requirements → INCLUDE controls
    (Gap identified, need this control)

IF answer = "YES":
    → Find requirements → EXCLUDE controls
    (Already have this, don't need control)

IF requirement in BOTH "YES" and "NO":
    → INCLUDE control (Prudence criteria)
    (Conservative approach, don't miss gaps)
```

### 2. Asset-to-Control Matching Algorithm

```
IF control.controlType = "TRANSVERSAL":
    IF control.minCriticalityLevel exists:
        RETURN asset.criticalityLevel >= control.minCriticalityLevel
    ELSE:
        RETURN true (applies to all assets)

IF control.controlType = "SPECIFIC":
    IF asset.assetType ∈ control.applicableAssetTypes:
        IF control.minCriticalityLevel exists:
            RETURN asset.criticalityLevel >= control.minCriticalityLevel
        ELSE:
            RETURN true
    ELSE:
        RETURN false (wrong asset type)
```

### 3. Priority Calculation Algorithm

```
priority = "LOW"

IF maxAssetCriticality >= 4 OR hasNonCompliantRequirements:
    priority = "CRITICAL"
ELSE IF maxAssetCriticality >= 3:
    priority = "HIGH"
ELSE IF maxAssetCriticality >= 2:
    priority = "MEDIUM"
ELSE:
    priority = "LOW"
```

---

## Example: Complete Flow

### Input:
- **24 questions** answered
- **41 "Yes"** (already have these capabilities)
- **5 "No"** (gaps identified)
- **1 "Not Applicable"**
- **15 assets** (various types, criticality 1-4)

### Processing:

1. **Answer Collection**: Categorize all answers
2. **Requirement Mapping**: "No" answers → 8 requirements
3. **Control Calculation**: Requirements → 12 controls
4. **Prudence Criteria**: Add 2 more controls (conflicts)
5. **Asset Matching**: 10 controls apply to assets
6. **Gap Analysis**: 7 gaps identified
7. **Remediation**: 7 actions created
8. **Strategy**: €180K investment, 3 phases, ROI 3.2x

### Output:
- **10 applicable controls** (reduced from 65+)
- **7 gaps** with priorities and reasoning
- **7 remediation actions** with asset mapping
- **Strategic plan** with investment breakdown

---

## Data Flow Summary

```
INPUTS:
├─ Questionnaire Answers (24 questions)
├─ Knowledge Base (250+ requirements, 137 controls)
└─ User Assets (with types and criticality)

PROCESSING:
├─ Phase 1: Collect & Categorize Answers
├─ Phase 2: Map Answers → Requirements
├─ Phase 3: Map Requirements → Controls
├─ Phase 4: Apply Prudence Criteria
├─ Phase 5: Match Assets to Controls
├─ Phase 6: Generate Gap Analysis
├─ Phase 7: Create Remediation Plan
└─ Phase 8: Generate Strategic Recommendations

OUTPUTS:
├─ Applicable Controls Set (10-20, not 65+)
├─ Gap Analysis (with reasoning)
├─ Remediation Plan (with asset mapping)
└─ Strategic Recommendations (investment, ROI, phases)
```

---

## Key Differentiators

1. **End-of-Questionnaire Calculation**: Not linear, aggregates all answers first
2. **Elimination/Inclusion Logic**: "Yes" excludes, "No" includes
3. **Prudence Criteria**: Handles conflicts intelligently
4. **Automatic Reduction**: 65+ controls → 10-20 applicable
5. **Reasoning Tracking**: Shows why each control was included
6. **Asset Matching**: Automatic based on type and criticality

---

## Files Involved

- **`app/api/questionnaire/response/route.ts`** - Phase 1-4 (Control calculation)
- **`app/api/gap-analysis/route.ts`** - Phase 5 (Asset matching, gap analysis)
- **`app/api/remediation/route.ts`** - Phase 6 (Remediation plan)
- **`lib/services/ai-strategy.ts`** - Phase 7 (Strategic recommendations)
- **`lib/services/rule-engine.ts`** - Core rule engine utilities
- **`models/QuestionnaireResponse.ts`** - Stores applicable controls + reasoning

---

## Technical Implementation Details

### Control Reasoning Tracking

The system tracks reasoning for each control to provide transparency:

```typescript
controlReasoning: {
  "controlId1": [
    "Included because: Answered 'No' to questions about risk management → Requirements DORA-REQ-045, DORA-REQ-046 → Control ISO-5.1"
  ],
  "controlId2": [
    "Included via prudence criteria: Requirement appears in both 'Yes' and 'No' answers → Conservative approach: include control ISO-7.3"
  ]
}
```

### Requirement Matching

Requirements are matched using:
1. **Keyword matching**: Question keywords matched against requirement text
2. **Direct mappings**: Question options can have `applicableControls` (requirement IDs)
3. **Pillar filtering**: Only requirements from the same pillar are considered

### Control Filtering Priority

1. **Priority 1**: Questionnaire response `applicableControls` (strict filtering)
2. **Priority 2**: Requirement mapping (if no questionnaire controls)
3. **Priority 3**: All controls for pillar (if no questionnaire)

---

## Performance Characteristics

- **Questionnaire Processing**: O(n) where n = number of answers
- **Requirement Matching**: O(n*m) where n = answers, m = requirements per pillar
- **Control Calculation**: O(r*c) where r = requirements, c = controls
- **Asset Matching**: O(c*a) where c = controls, a = assets
- **Overall Complexity**: Linear to polynomial, optimized with Set operations

---

## Future Enhancements

1. **Machine Learning**: Learn from user corrections to improve matching
2. **Confidence Scores**: Add confidence levels to control recommendations
3. **Historical Analysis**: Track how controls change over time
4. **Custom Rules**: Allow users to define custom matching rules
5. **Multi-Regulation**: Extend to other regulations (GDPR, NIS2)

