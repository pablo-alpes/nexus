# How to Rerun Question-to-Requirement Matching

## Quick Start

To rerun the precomputation with the improved matching logic, simply run:

```bash
cd nexus
npm run precompute:mappings
```

That's it! This will:
- ✅ Recalculate all question-to-requirement mappings
- ✅ Apply the new filtering logic (similarity >= 0.5, max 20 per question)
- ✅ Update QuestionMapping documents in the database
- ✅ Show progress and results for each question

---

## What Happens During Precomputation

1. **Loads NLP Model** (first time only, ~80MB download)
   - Downloads the transformer model if not already cached
   - This happens automatically, just wait for it

2. **Pre-computes Embeddings** (for all 246 requirements)
   - Generates semantic embeddings for each requirement
   - Caches them for reuse across questions
   - Takes a few minutes

3. **Processes Each Question** (24 questions total)
   - Generates question embedding
   - Calculates similarity to all requirements in the same pillar
   - Filters to only medium/high confidence (similarity >= 0.5)
   - Sorts by priority (control-based first, then similarity)
   - Takes top 20 requirements
   - Saves results to database

4. **Shows Results**
   - Progress for each question
   - Final coherence metrics
   - Confidence distribution

---

## Expected Output

You'll see output like this:

```
🚀 Starting precomputation for rule version 2.0...
Found 24 unique questions

📥 Pre-loading NLP model...
NLP model loaded successfully

📊 Pre-computing embeddings for 246 requirements...
✅ Cached 246 requirement embeddings

Precomputing mappings for Q-ICT-001...
   ✅ 20 control-based requirements (filtered from 204)
   ✅ 20 total requirements (filtered from 184)
   ✅ Coherence: 35.00%
✅ [1/24] Q-ICT-001

... (continues for all questions) ...

✅ Precomputation complete for version 2.0
   Processed 24/24 questions

📊 Overall Coherence Metrics
Rule Version: 2.0
Total Questions: 24
Average Coherence: 4.9%
Average Relevance: 27.9%
...
```

---

## How Long Does It Take?

- **First time**: 15-20 minutes
  - Downloads NLP model (~80MB)
  - Generates all embeddings
  
- **Subsequent runs**: 5-10 minutes
  - Uses cached NLP model
  - Uses cached requirement embeddings
  - Only recalculates similarities

---

## When to Rerun

Rerun precomputation when:

1. ✅ **After code changes** - If you modify the matching logic
2. ✅ **After adjusting thresholds** - If you change similarity thresholds or limits
3. ✅ **After adding new questions** - To compute mappings for new questions
4. ✅ **After updating requirements** - If requirements change
5. ✅ **After manual review** - If you manually curate mappings and want to regenerate

---

## Verifying Results

After precomputation, verify the improvements:

```bash
# Test question-to-requirement mapping
node scripts/test-question-requirement-mapping.js

# Test end-to-end flow
node scripts/test-matching-engine-flow.js
```

---

## Troubleshooting

### Issue: "NLP model download failed"

**Solution**: 
- Check internet connection
- The script will retry automatically (3 times)
- If it still fails, the model may be cached - try again

### Issue: "No requirements found for some questions"

**Solution**:
- This is expected for some questions if similarity is too low
- You can lower the threshold in `lib/services/precomputed-mappings.ts`:
  ```typescript
  const MIN_SIMILARITY_THRESHOLD = 0.5; // Lower to 0.4 for more matches
  ```

### Issue: "Too many/few requirements"

**Solution**:
- Adjust `MAX_REQUIREMENTS_PER_QUESTION` in `lib/services/precomputed-mappings.ts`:
  ```typescript
  const MAX_REQUIREMENTS_PER_QUESTION = 20; // Increase/decrease as needed
  ```

### Issue: "Precomputation takes too long"

**Solution**:
- First run is always slower (downloads model)
- Subsequent runs are faster (uses cache)
- You can run it in the background if needed

---

## Advanced: Adjusting Thresholds

If you want to adjust the matching parameters, edit `lib/services/precomputed-mappings.ts`:

```typescript
// Line 184-186
const MIN_SIMILARITY_THRESHOLD = 0.5;        // Lower = more requirements (but less accurate)
const MAX_REQUIREMENTS_PER_QUESTION = 20;     // Increase for more requirements
const PRIORITY_BOOST_FOR_CONTROL_BASED = 0.05; // Increase to prioritize control-based more
```

Then rerun:
```bash
npm run precompute:mappings
```

---

## What Gets Updated

The precomputation updates:
- ✅ `QuestionMapping` documents in the database
- ✅ `controlBasedRequirements` array (filtered, high-confidence only)
- ✅ `nlpSimilarities` array (filtered results)
- ✅ `coherenceMetrics` (recalculated based on filtered results)

**Note**: Existing questionnaire responses are NOT affected. They will use the new mappings when:
- A new questionnaire is submitted
- Gap analysis is regenerated

---

## Summary

**To rerun matching:**
```bash
cd nexus
npm run precompute:mappings
```

**To verify results:**
```bash
node scripts/test-question-requirement-mapping.js
```

That's it! The improved matching logic will be applied automatically.
