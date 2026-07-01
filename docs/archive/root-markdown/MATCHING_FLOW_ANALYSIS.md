# Matching Flow Analysis & Issues Found

## Current Flow

### ✅ Questionnaire Response Route (CORRECT)
1. **Questions → Requirements**: Uses precomputed mappings
   - Gets `precomputed.controlBasedRequirements` for each "No" answer
   - This is the static question-to-requirement mapping ✅

2. **Requirements → Controls**: Uses static Control.requirementIds mapping
   - Finds controls where `control.requirementIds` contains the requirement
   - This is the static requirement-to-control mapping ✅
   - Stores result in `questionnaireResponse.applicableControls` ✅

### ❌ Gap Analysis Route (INCORRECT)
1. **Tries to recalculate requirements from "Yes" answers** (lines 81-104)
   - Uses `question.options.applicableControls` (which may not exist or be outdated)
   - This is WRONG - should use precomputed mappings, not recalculate

2. **Uses questionnaireResponse.applicableControls** (lines 120-125)
   - This is CORRECT ✅
   - But the fallback logic is wrong

## The Problem

The gap analysis is:
1. ✅ Correctly using `questionnaireResponse.applicableControls` when it exists
2. ❌ But has fallback logic that recalculates requirements incorrectly
3. ❌ The fallback uses `question.options.applicableControls` which is outdated

## The Fix Needed

Gap analysis should:
1. **Always use `questionnaireResponse.applicableControls`** if questionnaire exists
   - This was already calculated correctly using:
     - Precomputed question-to-requirement mappings
     - Static requirement-to-control mappings
2. **Only fallback to all controls** if no questionnaire exists at all
3. **Remove the requirement recalculation logic** - it's redundant and incorrect

## Flow Should Be

```
Questionnaire Submission:
  Questions (with "No" answers)
    ↓ [Precomputed Mappings - Static]
  Requirements (from precomputed mappings)
    ↓ [Control.requirementIds - Static]
  Controls (stored in questionnaireResponse.applicableControls)
    ↓
  Saved to database

Gap Analysis:
  Read questionnaireResponse.applicableControls
    ↓ [Direct use - no recalculation]
  Filter controls for pillar
    ↓
  Match to assets
    ↓
  Calculate gaps
```

## Issues to Fix

1. Remove requirement recalculation in gap analysis (lines 78-111)
2. Simplify gap analysis to only use `applicableControls` from questionnaire response
3. Ensure proper ID matching between questionnaire response and controls
