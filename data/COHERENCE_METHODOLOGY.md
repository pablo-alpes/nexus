# Coherence Measurement Methodology

## How Quality/Coherence is Measured

### Current Measurement Approach

The coherence analysis uses a **keyword-based relevance scoring** method:

#### 1. Keyword Extraction

```javascript
function extractKeywords(text) {
  // Remove stop words and extract meaningful terms
  const stopWords = ['do', 'you', 'have', 'for', 'and', 'the', 'with', ...];
  return text.toLowerCase()
    .split(/[\s,\.\?\!]+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}
```

**Example:**
- Question: "Do you have a process for identifying and managing ICT vulnerabilities?"
- Extracted keywords: `["process", "identifying", "managing", "vulnerabilities"]`

#### 2. Relevance Score Calculation

```javascript
function calculateRelevance(questionText, requirementText) {
  const questionKeywords = extractKeywords(questionText);
  const reqText = requirementText.toLowerCase();
  
  // Count how many question keywords appear in requirement
  const matches = questionKeywords.filter(kw => reqText.includes(kw));
  const relevanceScore = matches.length / questionKeywords.length;
  
  return {
    score: relevanceScore,  // 0.0 to 1.0
    matchedKeywords: matches,
    totalKeywords: questionKeywords.length
  };
}
```

**Formula:**
```
Relevance Score = (Number of matched keywords) / (Total keywords in question)
```

**Example:**
- Question keywords: `["process", "identifying", "managing", "vulnerabilities"]` (4 keywords)
- Requirement text: "Financial entities shall have processes for managing ICT risks..."
- Matched keywords: `["process", "managing"]` (2 keywords)
- **Relevance Score: 2/4 = 0.5 (50%)**

#### 3. Relevance Threshold

A match is considered **"relevant"** if:
```
Relevance Score > 0.3 (at least 30% of keywords match)
```

**Rationale:**
- If less than 30% of question keywords appear in the requirement, it's likely not semantically related
- This threshold filters out weak matches

#### 4. Coherence Score

For each question:
```
Coherence Score = (Number of relevant matches) / (Total matches)
```

**Example:**
- Total matches: 55
- Relevant matches (score > 0.3): 0
- **Coherence Score: 0/55 = 0.0 (0%)**

#### 5. Average Relevance

For each question:
```
Average Relevance = Sum of all relevance scores / Number of matches
```

**Example:**
- Match 1: 0.25 (25%)
- Match 2: 0.30 (30%)
- Match 3: 0.15 (15%)
- **Average Relevance: (0.25 + 0.30 + 0.15) / 3 = 0.233 (23.3%)**

---

## Limitations of Current Method

### ⚠️ Still Uses Keyword Matching

**Problem:** The coherence measurement itself uses keyword matching, which has the same limitations:

1. **Semantic Gaps**
   - "vulnerability management" vs "risk management" - different concepts but share keywords
   - "incident response" vs "incident reporting" - related but different
   - Legal language doesn't match question wording

2. **Context Missing**
   - Doesn't understand meaning, only word presence
   - "process" appears in many requirements but means different things
   - Can't distinguish between relevant and irrelevant uses of same word

3. **Threshold Arbitrary**
   - 0.3 (30%) threshold is arbitrary
   - Some relevant matches might score < 0.3
   - Some irrelevant matches might score > 0.3

### Example of Limitation

**Question:** "Do you have a process for identifying and managing ICT vulnerabilities?"

**Requirement 1:** "Financial entities shall have processes for managing ICT risks and vulnerabilities..."
- Keywords matched: `["process", "managing", "vulnerabilities"]` (3/4 = 75%)
- **Relevance: 0.75 (75%)** ✅ Relevant

**Requirement 2:** "Financial entities shall have processes for governance and organization..."
- Keywords matched: `["process"]` (1/4 = 25%)
- **Relevance: 0.25 (25%)** ❌ Irrelevant (below 0.3 threshold)

**But Requirement 2 might actually be relevant** if governance processes include vulnerability management, even though it doesn't mention "vulnerabilities" explicitly.

---

## Better Measurement Approaches

### Option 1: Semantic Similarity (NLP)

Use NLP models to calculate semantic similarity:

```javascript
// Using sentence embeddings (e.g., Universal Sentence Encoder)
const similarity = calculateSemanticSimilarity(
  questionText,
  requirementText
);
// Returns 0.0 to 1.0 based on meaning, not just keywords
```

**Advantages:**
- Understands meaning, not just words
- Handles synonyms and related concepts
- More accurate relevance scoring

**Disadvantages:**
- Requires NLP models/libraries
- More complex implementation
- Still needs human validation

### Option 2: Control-Based Validation

Use control mappings as ground truth:

```javascript
// If requirement maps to controls that are relevant to question
// Then requirement is relevant to question
const isRelevant = checkControlMapping(question, requirement);
```

**Advantages:**
- Uses existing control→requirement mappings
- Logical connections, not keyword matching
- More reliable

**Disadvantages:**
- Requires complete control mappings
- Circular dependency (need controls to validate)

### Option 3: Human Review + Machine Learning

Combine human review with ML:

1. **Initial Human Review**
   - Domain expert reviews sample of matches
   - Labels as relevant/irrelevant
   - Creates training data

2. **ML Model Training**
   - Train classifier on human-labeled data
   - Learn patterns of relevance
   - Predict relevance for new matches

3. **Continuous Improvement**
   - Human reviews ML predictions
   - Retrain model with feedback
   - Improve over time

**Advantages:**
- Learns from domain expertise
- Improves over time
- Combines human judgment with automation

**Disadvantages:**
- Requires initial human review effort
- Needs ML infrastructure
- More complex

### Option 4: Explicit Mappings (Recommended)

**Best approach:** Don't measure coherence of keyword matches - use explicit mappings instead:

1. **Human Review**
   - Domain expert maps each question to requirements
   - Validates semantic relevance
   - Ensures coherence

2. **Control-Based Logic**
   - Use control→requirement relationships
   - Logical connections, not keyword matching
   - Validated mappings

3. **Quality Assurance**
   - Review process ensures coherence
   - Can measure and improve
   - Audit trail

**Advantages:**
- 100% coherence (human-validated)
- No false positives
- Full traceability
- Reliable results

**Disadvantages:**
- Requires initial manual effort
- Needs maintenance

---

## Current Results Interpretation

### What the Current Metrics Mean

**Relevance Score (0-100%):**
- Percentage of question keywords that appear in requirement
- **Not** a measure of semantic relevance
- **Not** a measure of actual requirement relevance
- Just keyword overlap

**Coherence Score (0-100%):**
- Percentage of matches with relevance score > 0.3
- **Not** a measure of actual coherence
- **Not** validated by domain experts
- Just a threshold-based filter

### Why Results Show Poor Quality

The 50.7% false positive rate means:
- More than half of keyword matches have < 30% keyword overlap
- These are likely semantically irrelevant
- But some might still be relevant (false negatives)
- And some above 30% might be irrelevant (false positives)

**The real issue:** Keyword matching is fundamentally flawed for measuring semantic relevance.

---

## Recommendation

### For Measurement (Short Term)

1. **Acknowledge Limitations**
   - Current metrics are approximate
   - Use as indicators, not absolute truth
   - Combine with human review

2. **Improve Threshold**
   - Test different thresholds (0.2, 0.3, 0.4, 0.5)
   - Find optimal balance
   - Validate with human review

3. **Add Semantic Analysis**
   - Use NLP for better relevance scoring
   - Combine keyword + semantic similarity
   - Improve accuracy

### For Solution (Long Term)

**Use Explicit Mappings:**
- Don't measure coherence of keyword matches
- Create explicit, human-validated mappings
- Ensure 100% coherence from the start
- No need to measure - it's guaranteed

---

## Summary

**Current Measurement:**
- Uses keyword overlap (not semantic relevance)
- Threshold-based (0.3 = 30% keyword match)
- Approximate indicator, not absolute truth
- Shows ~50% false positives, but may have errors

**Better Approach:**
- Use explicit mappings (human-validated)
- Don't measure coherence - ensure it
- Control-based logic for validation
- 100% coherence guaranteed

**The measurement shows the problem exists, but the solution is to fix it, not just measure it better.**

