# Hybrid Approach: Logic-Based + NLP Matching

## The Idea

Combine **two complementary approaches**:
1. **Logic-Based (Control Mappings)** - Primary source of truth
2. **NLP/Keyword Matching** - Validation and suggestion tool

---

## Comparison of Approaches

### Approach 1: Pure Keyword Matching (Current)
```
Question → Keywords → Search Requirements → Matches
```

**Problems:**
- ❌ 50.7% false positives
- ❌ 40.7% average relevance
- ❌ No semantic understanding
- ❌ No logical validation

**Strength:** Automatic, no manual work

---

### Approach 2: Pure Explicit Mappings (Proposed)
```
Question → Explicit Requirements (Human-Validated) → Matches
```

**Advantages:**
- ✅ 100% coherence (human-validated)
- ✅ 0% false positives
- ✅ Full traceability
- ✅ Control-based logic

**Limitations:**
- ⚠️ Requires manual mapping effort
- ⚠️ Needs maintenance when requirements change
- ⚠️ No automatic suggestions

---

### Approach 3: Hybrid - Logic + NLP (Best of Both Worlds)

```
Question → {
  Primary: Control-Based Logic (Explicit Mappings)
  Secondary: NLP/Keyword Matching (Validation/Suggestions)
} → Validated Matches
```

**How it works:**

1. **Primary: Control-Based Logic**
   - Use explicit mappings from control→requirement relationships
   - This is the source of truth
   - Ensures logical coherence

2. **Secondary: NLP/Keyword Validation**
   - For each explicit mapping, calculate NLP relevance score
   - Flag low-relevance mappings for human review
   - Suggest additional requirements that might be relevant

3. **Combined Result**
   - Start with logic-based mappings (reliable)
   - Validate with NLP (catch errors)
   - Suggest improvements (find missing mappings)

---

## Hybrid Approach Architecture

### Step 1: Control-Based Primary Mapping

```javascript
// Get requirements from control mappings
const controlBasedRequirements = getRequirementsFromControls(question);

// This is the primary source - logic-based, validated
// Example: Q-ICT-004 → Controls → Requirements
// Result: 102 requirements (from control mappings)
```

**Advantages:**
- ✅ Logical connections (control → requirement)
- ✅ Validated relationships
- ✅ ISO standard references
- ✅ Reliable foundation

### Step 2: NLP Validation

```javascript
// For each control-based requirement, calculate NLP relevance
const validatedRequirements = controlBasedRequirements.map(req => {
  const relevance = calculateNLPRelevance(question.text, req.text);
  return {
    requirement: req,
    relevanceScore: relevance.score,
    semanticSimilarity: relevance.semantic,
    isHighConfidence: relevance.score > 0.7
  };
});

// Flag low-relevance for review
const lowRelevance = validatedRequirements.filter(r => r.relevanceScore < 0.5);
// These might be false positives in control mappings
```

**Advantages:**
- ✅ Catches errors in control mappings
- ✅ Validates semantic relevance
- ✅ Flags questionable mappings

### Step 3: NLP Suggestions

```javascript
// Find additional requirements that might be relevant (not in control mappings)
const allRequirements = getAllRequirements(question.pillar);
const controlBasedIds = new Set(controlBasedRequirements.map(r => r.id));

const suggestedRequirements = allRequirements
  .filter(req => !controlBasedIds.has(req.id))
  .map(req => {
    const relevance = calculateNLPRelevance(question.text, req.text);
    return {
      requirement: req,
      relevanceScore: relevance.score,
      semanticSimilarity: relevance.semantic
    };
  })
  .filter(s => s.relevanceScore > 0.6) // High confidence suggestions
  .sort((a, b) => b.relevanceScore - a.relevanceScore)
  .slice(0, 10); // Top 10 suggestions

// Present to human for review
```

**Advantages:**
- ✅ Finds potentially missing mappings
- ✅ Suggests improvements
- ✅ Helps complete coverage

---

## Implementation Example

```javascript
async function hybridMatching(question) {
  // STEP 1: Control-Based Primary (Logic)
  const controlBasedReqs = await getRequirementsFromControls(question);
  console.log(`Control-based: ${controlBasedReqs.length} requirements`);
  
  // STEP 2: NLP Validation
  const validated = controlBasedReqs.map(req => {
    const nlpScore = await calculateNLPRelevance(question.text, req.text);
    return {
      ...req,
      nlpRelevance: nlpScore,
      confidence: nlpScore > 0.7 ? 'high' : nlpScore > 0.5 ? 'medium' : 'low'
    };
  });
  
  // High confidence: Use directly
  const highConfidence = validated.filter(r => r.confidence === 'high');
  
  // Medium confidence: Use but flag for review
  const mediumConfidence = validated.filter(r => r.confidence === 'medium');
  
  // Low confidence: Flag for human review (might be error in control mapping)
  const lowConfidence = validated.filter(r => r.confidence === 'low');
  
  // STEP 3: NLP Suggestions
  const suggestions = await findNLPSuggestions(question, controlBasedReqs);
  
  return {
    primary: highConfidence,           // Use directly
    review: mediumConfidence,          // Review recommended
    questionable: lowConfidence,       // Human review required
    suggestions: suggestions           // Potential additions
  };
}
```

---

## Benefits of Hybrid Approach

### 1. Reliability
- **Primary:** Control-based logic ensures logical coherence
- **Validation:** NLP catches errors and validates relevance
- **Result:** More reliable than either alone

### 2. Completeness
- **Primary:** Control mappings provide base coverage
- **Suggestions:** NLP finds potentially missing mappings
- **Result:** Better coverage than pure explicit

### 3. Quality Assurance
- **Validation:** NLP flags questionable mappings
- **Review:** Human reviews flagged items
- **Result:** Higher quality than pure keyword

### 4. Efficiency
- **Automation:** Control-based logic provides base
- **Assistance:** NLP suggests improvements
- **Result:** Less manual work than pure explicit

---

## Comparison Matrix

| Aspect | Pure Keyword | Pure Explicit | Hybrid (Logic + NLP) |
|--------|-------------|---------------|---------------------|
| **Reliability** | ❌ Low (50% false positives) | ✅ High (100% validated) | ✅✅ Very High (validated) |
| **Coverage** | ⚠️ Medium (45.8%) | ✅ High (100%) | ✅✅ Very High (100% + suggestions) |
| **Quality** | ❌ Poor (40% relevance) | ✅ High (100% relevant) | ✅✅ Very High (validated) |
| **Automation** | ✅ High (automatic) | ❌ Low (manual) | ✅ Medium (semi-automatic) |
| **Maintenance** | ✅ Low (automatic) | ⚠️ Medium (manual updates) | ✅ Low (NLP assists) |
| **Traceability** | ❌ None | ✅ Full | ✅✅ Full + validation |
| **Error Detection** | ❌ None | ⚠️ Manual | ✅✅ Automatic (NLP flags) |

---

## Recommended Hybrid Strategy

### Phase 1: Control-Based Foundation
1. Create explicit mappings from control→requirement relationships
2. This is the primary source of truth
3. Ensures logical coherence

### Phase 2: NLP Validation Layer
1. Add NLP relevance scoring for each mapping
2. Flag low-relevance mappings for review
3. Validate semantic coherence

### Phase 3: NLP Suggestion System
1. Find potentially missing requirements
2. Suggest additions based on semantic similarity
3. Human reviews and approves suggestions

### Phase 4: Continuous Improvement
1. Learn from human reviews
2. Improve NLP models
3. Refine control mappings
4. Iterate and improve

---

## NLP Implementation Options

### Option 1: Simple Keyword + TF-IDF
```javascript
function calculateNLPRelevance(question, requirement) {
  // Extract keywords with TF-IDF weighting
  const questionTerms = extractTFIDFTerms(question);
  const reqTerms = extractTFIDFTerms(requirement);
  
  // Calculate cosine similarity
  const similarity = cosineSimilarity(questionTerms, reqTerms);
  return similarity; // 0.0 to 1.0
}
```

**Pros:** Simple, fast, no external dependencies  
**Cons:** Still keyword-based, limited semantic understanding

### Option 2: Sentence Embeddings (Recommended)
```javascript
// Using Universal Sentence Encoder or similar
async function calculateNLPRelevance(question, requirement) {
  const questionEmbedding = await model.embed(question);
  const reqEmbedding = await model.embed(requirement);
  
  // Calculate cosine similarity of embeddings
  const similarity = cosineSimilarity(questionEmbedding, reqEmbedding);
  return similarity; // 0.0 to 1.0 (semantic similarity)
}
```

**Pros:** Understands semantics, handles synonyms, better accuracy  
**Cons:** Requires ML model, more complex

### Option 3: Transformer Models (Best Quality)
```javascript
// Using BERT, RoBERTa, or similar
async function calculateNLPRelevance(question, requirement) {
  const model = await loadTransformerModel('sentence-transformers/all-MiniLM-L6-v2');
  
  const questionEmbedding = await model.encode(question);
  const reqEmbedding = await model.encode(requirement);
  
  const similarity = cosineSimilarity(questionEmbedding, reqEmbedding);
  return similarity;
}
```

**Pros:** Best semantic understanding, state-of-the-art  
**Cons:** Requires ML infrastructure, more complex

---

## Recommended Implementation

### For Your Use Case

**Best Approach: Hybrid with Sentence Embeddings**

1. **Primary:** Control-based explicit mappings
   - Use existing control→requirement relationships
   - This is your source of truth
   - Ensures logical coherence

2. **Validation:** Sentence embedding similarity
   - Use a lightweight model (e.g., Universal Sentence Encoder)
   - Calculate semantic similarity for each mapping
   - Flag low-similarity (< 0.5) for review

3. **Suggestions:** Find missing mappings
   - Search all requirements for high similarity (> 0.7)
   - Present top suggestions to human
   - Human reviews and approves

### Implementation Priority

1. **Start with Control-Based (Phase 1)**
   - Create explicit mappings from controls
   - This solves 80% of the problem
   - Provides reliable foundation

2. **Add NLP Validation (Phase 2)**
   - Implement sentence embeddings
   - Validate existing mappings
   - Flag questionable items

3. **Add NLP Suggestions (Phase 3)**
   - Find potentially missing mappings
   - Suggest improvements
   - Complete coverage

---

## Conclusion

**Yes, Logic + NLP is stronger than either alone:**

- **Logic-Based:** Provides reliable foundation, ensures coherence
- **NLP:** Validates relevance, suggests improvements
- **Combined:** Best of both worlds - reliable + complete + validated

**Recommended Strategy:**
1. Start with control-based explicit mappings (primary)
2. Add NLP validation layer (quality assurance)
3. Add NLP suggestions (completeness)
4. Continuous improvement (iterative refinement)

This hybrid approach gives you:
- ✅ Reliability of explicit mappings
- ✅ Validation of NLP
- ✅ Suggestions for completeness
- ✅ Best of both worlds

