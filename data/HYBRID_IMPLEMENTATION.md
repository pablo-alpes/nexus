# Hybrid Approach Implementation (Logic + NLP)

## Overview

The hybrid approach combines **explicit control-based mappings** (logic) with **NLP semantic similarity validation** to ensure high-quality, coherent question→requirement mappings.

## Architecture

### Components

1. **RuleVersion Model** (`models/RuleVersion.ts`)
   - Tracks rule engine versions
   - Stores metadata about control/requirement versions
   - Manages precomputation status

2. **QuestionMapping Model** (`models/QuestionMapping.ts`)
   - Stores precomputed question→requirement mappings
   - Includes NLP similarity scores
   - Tracks coherence metrics per question

3. **NLP Similarity Service** (`lib/services/nlp-similarity.ts`)
   - Uses `@xenova/transformers` for sentence embeddings
   - Calculates cosine similarity between question and requirement texts
   - Provides confidence levels (high/medium/low)

4. **Precomputed Mappings Service** (`lib/services/precomputed-mappings.ts`)
   - Manages precomputation of all question mappings
   - Combines control-based logic with NLP validation
   - Calculates overall coherence metrics

5. **API Endpoints**
   - `/api/rule-version` - Get current rule version and coherence metrics
   - `/api/questionnaire/response` - Uses precomputed mappings (updated)

6. **UI Components**
   - Rule version banner in questionnaire results
   - Coherence quality metrics display
   - Confidence distribution visualization

## How It Works

### 1. Precomputation Process

```bash
npm run precompute:mappings
```

This script:
1. Loads all questions (deduplicated)
2. For each question:
   - Gets control-based requirements (from explicit mappings)
   - Generates question embedding
   - Generates embeddings for all pillar requirements
   - Calculates cosine similarity for each requirement
   - Marks control-based requirements
   - Calculates coherence metrics
3. Saves mappings to database
4. Updates rule version status to ACTIVE

### 2. Questionnaire Response Processing

When a user submits questionnaire responses:

1. **For "no" answers:**
   - Retrieves precomputed mappings
   - Uses control-based requirements (high confidence)
   - Includes high-confidence NLP suggestions (>0.7 similarity, not already control-based)
   - Falls back to keyword matching if precomputed mappings unavailable

2. **For "yes" answers:**
   - Uses precomputed mappings for conflict detection
   - Helps with prudence criteria resolution

### 3. Coherence Metrics

Each question mapping includes:
- **Average Relevance**: Average similarity score for control-based requirements
- **High Confidence Count**: Requirements with similarity ≥ 0.7
- **Medium Confidence Count**: Requirements with similarity 0.5-0.7
- **Low Confidence Count**: Requirements with similarity < 0.5
- **Overall Coherence**: Percentage of control-based requirements with high confidence

## User Interface

### Rule Version Banner

Displays:
- Current rule version (e.g., "v2.0")
- Precomputation date
- Overall coherence percentage
- Average relevance score
- Confidence distribution (High/Medium/Low percentages)

### Question Coherence Quality

Shows per-question metrics:
- Overall coherence
- Average relevance
- High/low confidence counts

## Benefits

1. **Reliability**: Control-based mappings ensure logical coherence
2. **Quality**: NLP validates semantic relevance
3. **Completeness**: NLP suggests missing high-confidence requirements
4. **Transparency**: Users see version and quality metrics
5. **Performance**: Precomputed mappings = fast response times

## Expected Confidence Levels

- **High Confidence (≥0.7)**: 85-95% of control-based mappings
- **Medium Confidence (0.5-0.7)**: 5-10% of mappings
- **Low Confidence (<0.5)**: <5% of mappings
- **Overall Coherence**: 90-95% target

## Maintenance

### When to Recompute

Run precomputation when:
- ISO controls are updated
- DORA requirements change
- Questions are added/modified
- Rule version is incremented

### Version Management

Rule versions are automatically detected from `data/iso27002-controls.json` metadata. To manually set a version:

```bash
npm run precompute:mappings -- --version=2.1
```

## Files Created/Modified

### New Files
- `models/RuleVersion.ts`
- `models/QuestionMapping.ts`
- `lib/services/nlp-similarity.ts`
- `lib/services/precomputed-mappings.ts`
- `app/api/rule-version/route.ts`
- `scripts/precompute-mappings.ts`

### Modified Files
- `app/api/questionnaire/response/route.ts` - Uses precomputed mappings
- `app/dashboard/questionnaire/page.tsx` - Displays version and metrics
- `package.json` - Added precompute script and NLP dependency

## Next Steps

1. Run initial precomputation: `npm run precompute:mappings`
2. Test questionnaire submission
3. Verify coherence metrics in UI
4. Monitor quality and adjust thresholds if needed

