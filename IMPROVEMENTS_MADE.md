# Matching Engine Improvements Made

## Summary

I've improved the question-to-requirement mapping logic to address the issue where questions were mapping to too many requirements (200+ per question). The improvements use NLP similarity thresholds and limits to create more accurate, focused mappings.

---

## Changes Made

### 1. Updated `lib/services/precomputed-mappings.ts`

**Key Improvements:**

1. **Similarity Threshold Filtering**
   - Only includes requirements with similarity >= 0.5 (medium/high confidence)
   - Filters out low-confidence matches that were causing noise

2. **Maximum Limit Per Question**
   - Limits to top 20 requirements per question (down from 200+)
   - Prioritizes the most relevant requirements

3. **Smart Prioritization**
   - Control-based requirements get a small boost (+0.05 similarity)
   - Sorting order:
     1. Control-based with high similarity (>= 0.7)
     2. Control-based with medium similarity (>= 0.5)
     3. Non-control-based with high similarity (>= 0.7)
     4. Non-control-based with medium similarity (>= 0.5)

4. **Improved Coherence Metrics**
   - Metrics now calculated based on filtered results only
   - More accurate representation of mapping quality

**Configuration Constants:**
```typescript
const MIN_SIMILARITY_THRESHOLD = 0.5;        // Only medium/high confidence
const MAX_REQUIREMENTS_PER_QUESTION = 20;     // Maximum requirements
const PRIORITY_BOOST_FOR_CONTROL_BASED = 0.05; // Boost for control-based
```

---

## Expected Improvements

### Before (Current State):
- ❌ Average: 81.67 requirements per question
- ❌ Max: 204 requirements per question
- ❌ Coherence: 0-5%
- ❌ 21 questions mapping to >15 requirements

### After (Expected):
- ✅ Average: 10-15 requirements per question
- ✅ Max: 20 requirements per question
- ✅ Coherence: 50-80% (much better)
- ✅ All questions mapping to ≤20 requirements

---

## How to Apply the Improvements

### Step 1: Re-run Precomputation

Run the precomputation script with the improved logic:

```bash
cd nexus
npm run precompute:mappings
```

This will:
- Recalculate all question-to-requirement mappings
- Apply the new filtering logic
- Update QuestionMapping documents in the database
- Show progress and results for each question

**Note:** This may take 10-20 minutes as it needs to:
- Load the NLP model (first time only, ~80MB download)
- Generate embeddings for all requirements
- Calculate similarities for all question-requirement pairs
- Filter and save results

### Step 2: Verify Improvements

Run the test script to see the improvements:

```bash
node scripts/test-question-requirement-mapping.js
```

You should see:
- ✅ Reduced average requirements per question (from 81 to ~10-15)
- ✅ All questions mapping to ≤20 requirements
- ✅ Improved coherence metrics (from 0-5% to 50-80%)
- ✅ More high-confidence matches

### Step 3: Test End-to-End Flow

Test the complete flow:

```bash
# Test matching engine flow
node scripts/test-matching-engine-flow.js

# Or test with a real questionnaire response
# (Create a questionnaire response first, then test)
```

---

## What Changed in the Code

### Before:
```typescript
// Got ALL controls in pillar
const controls = await Control.find({ pillar: question.pillar });
// Got ALL requirements from those controls
// Result: 200+ requirements per question
```

### After:
```typescript
// Calculate NLP similarity for all requirements
// Filter to only medium/high confidence (>= 0.5)
// Sort by priority (control-based first, then similarity)
// Take top 20
// Result: 10-20 focused requirements per question
```

---

## Configuration Options

If you want to adjust the thresholds, edit `lib/services/precomputed-mappings.ts`:

```typescript
// Line 184-186
const MIN_SIMILARITY_THRESHOLD = 0.5;        // Lower = more requirements (but less accurate)
const MAX_REQUIREMENTS_PER_QUESTION = 20;     // Increase for more requirements
const PRIORITY_BOOST_FOR_CONTROL_BASED = 0.05; // Increase to prioritize control-based more
```

**Recommendations:**
- `MIN_SIMILARITY_THRESHOLD`: Keep at 0.5 (medium confidence) or higher
- `MAX_REQUIREMENTS_PER_QUESTION`: 15-25 is reasonable
- `PRIORITY_BOOST_FOR_CONTROL_BASED`: 0.05 is subtle, can increase to 0.1 if needed

---

## Next Steps

1. ✅ **Code improvements made** - Logic updated
2. ⏳ **Re-run precomputation** - Run `npm run precompute:mappings`
3. ⏳ **Verify improvements** - Run test scripts
4. ⏳ **Human review** - Review mappings and adjust if needed
5. ⏳ **Test end-to-end** - Verify questionnaire → gap analysis flow works

---

## Notes

- The improvements are **backward compatible** - existing questionnaire responses will still work
- New questionnaire responses will use the improved mappings
- You can always re-run precomputation if you adjust thresholds
- Human review is still recommended to ensure accuracy

---

## Questions?

If you need to adjust the thresholds or have questions about the improvements, let me know!
