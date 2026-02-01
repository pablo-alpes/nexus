# Model Migration - Clarification Needed

## Current Flow (What We Want to Keep)

The system currently works with this model:

```
Questions → Requirements → Controls → Assets
```

### Step 1: Questions → Requirements
- **Storage**: `QuestionMapping` model
- **Method**: Precomputed mappings (NLP + control-based)
- **Key Field**: `controlBasedRequirements` (array of requirement IDs)
- **Usage**: When user answers "No" to a question, system gets requirements from precomputed mappings

### Step 2: Requirements → Controls  
- **Storage**: `Control.requirementIds` (array of requirement references)
- **Method**: Static mapping (defined in data/iso27002-controls.json and database)
- **Usage**: System finds controls where `requirementIds` contains the requirement

### Step 3: Controls → Assets
- **Method**: Logic-based (control type, asset type, criticality level)
- **Usage**: Determines which controls apply to which assets

## Current Implementation

**Questions Model**: `models/Question.ts`
- Has `pillar` field (DORA-specific)
- References controls via `options.applicableControls`

**Requirements Model**: `models/DORARequirement.ts` (DORA-specific)
- Has `requirementId`, `pillar`, `title`, `description`, `legalText`
- Used by precomputed mappings

**Controls Model**: `models/Control.ts`
- Has `requirementIds` array (references to DORARequirement)
- Has `pillar` field (DORA-specific enum)

**QuestionMapping Model**: `models/QuestionMapping.ts`
- Stores `controlBasedRequirements` (array of requirement ID strings)
- Links questions to requirements

## What We've Created

**Generic Requirement Model**: `models/Requirement.ts`
- Has `regulationType` field
- Has `pillar` field (string, not enum)
- Supports both ISO 27001 and ISO 27701 mappings
- Can work with any regulation

## Questions for Clarification

### 1. Model Migration Scope

**Option A**: Keep both models (DORARequirement + Requirement)
- DORA continues using `DORARequirement`
- Chilean Privacy uses `Requirement`
- Both models work in parallel
- **Pros**: No breaking changes, gradual migration
- **Cons**: Code duplication, two code paths

**Option B**: Migrate DORA to generic `Requirement` model
- All requirements use `Requirement` model
- Add `regulationType: 'DORA'` to all DORA requirements
- Update all code to use `Requirement` instead of `DORARequirement`
- **Pros**: Single code path, cleaner architecture
- **Cons**: Requires updating all existing code

**Which approach do you prefer?**

### 2. Question Mapping Preservation

The current flow uses:
- `QuestionMapping.controlBasedRequirements` (array of requirement ID strings)
- These IDs reference `DORARequirement.requirementId`

**Question**: Should we:
- Keep the same structure (array of requirement ID strings)?
- Just change the lookup to use `Requirement` model instead of `DORARequirement`?
- Or do you want a different structure?

### 3. Control Model Updates

Currently `Control.requirementIds` references `DORARequirement`.

**Question**: Should we:
- Keep `requirementIds` as ObjectId references (works with `Requirement` model)?
- Or change to string requirement IDs?
- Or add a `regulationType` field to Control to filter by regulation?

### 4. Pillar Handling

Currently:
- DORA uses enum: `DORAPillar` (5 values)
- Chilean Privacy uses string pillars (8 values)
- Questions have `pillar` field (string)

**Question**: Should we:
- Keep `pillar` as string in all models?
- Use regulation config to validate pillars?
- Or something else?

### 5. Precomputed Mappings

The `precomputed-mappings.ts` service currently:
- Uses `DORARequirement.find({ pillar })` to get requirements
- Uses `Control.find({ pillar })` to get controls
- References `doraRequirements` in ISO controls JSON

**Question**: Should we:
- Update to use `Requirement.find({ regulationType, pillar })`?
- Make it regulation-aware (accept regulationType parameter)?
- Keep backward compatibility with DORA?

### 6. ISO Controls JSON Structure

Currently `data/iso27002-controls.json` has:
- `doraRequirements` array (DORA-specific)

We created `data/iso27701-controls.json` with:
- `chileRequirements` array (Chilean Privacy-specific)

**Question**: Should we:
- Keep separate arrays (`doraRequirements`, `chileRequirements`)?
- Create a generic `requirements` array with regulation type?
- Or use a different structure?

## Recommended Approach (Pending Your Approval)

Based on "keep the same model" requirement, I suggest:

1. **Keep the flow**: Questions → Requirements → Controls → Assets (unchanged)

2. **Migrate DORA to Requirement model**:
   - Add `regulationType: 'DORA'` to all DORA requirements
   - Update all code to query `Requirement.find({ regulationType: 'DORA' })` instead of `DORARequirement.find()`
   - Keep `DORARequirement` model for backward compatibility (deprecated)

3. **Update QuestionMapping**:
   - Keep `controlBasedRequirements` as array of strings
   - Just change lookup to use `Requirement` model

4. **Update Control model**:
   - Keep `requirementIds` as ObjectId references
   - Add `regulationType` field for filtering
   - Update queries to filter by regulation

5. **Update precomputed mappings**:
   - Make regulation-aware
   - Accept `regulationType` parameter
   - Query `Requirement` instead of `DORARequirement`

6. **ISO Controls JSON**:
   - Keep current structure for now
   - Add helper functions to get requirements by regulation type

**Does this approach align with your vision? Or would you prefer a different approach?**

## What I Need From You

Please clarify:
1. **Migration approach**: Option A (parallel) or Option B (full migration)?
2. **Question mapping**: Keep current structure or change?
3. **Control references**: Keep ObjectId or change to strings?
4. **Pillar handling**: Keep as-is or change?
5. **Any other concerns** about maintaining the Questions → Requirements → Controls flow?

Once clarified, I'll implement the migration accordingly.
