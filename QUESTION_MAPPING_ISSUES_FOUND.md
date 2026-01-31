# Question-to-Requirement Mapping Issues - CONFIRMED

## ✅ Hypothesis Confirmed

Your hypothesis was **100% correct**! The test results show that questions are **vastly over-mapped** to requirements and controls, causing the mismatches you're experiencing.

---

## 🔴 Critical Findings

### Issue 1: Questions Map to Too Many Requirements

**The Problem:**
- **ICT_RISK_MANAGEMENT questions** (Q-ICT-001 through Q-ICT-006) each map to **204 requirements** out of 246 total!
- **THIRD_PARTY_RISK questions** (Q-TP-001 through Q-TP-005) each map to **66 requirements**
- **Average**: 81.67 requirements per question
- **21 out of 24 questions** map to more than 15 requirements

**Example:**
```
Q-ICT-001: "Do you have an ICT risk management framework in place?"
  → Maps to 204 requirements (83% of all requirements!)
  → Maps to 111 controls (81% of all controls!)
```

### Issue 2: Questions Map to Too Many Controls

**The Problem:**
- ICT questions map to **111 controls** (out of 137 total = 81%!)
- Incident questions map to **35 controls**
- **16 questions** map to more than 10 controls

**Impact:** When a user answers "no" to a question, the system thinks they need 111 controls, which is clearly wrong.

### Issue 3: Very Low Coherence

**The Problem:**
- Most questions have **0% coherence** (meaning NLP similarity doesn't validate the mappings)
- Even the "best" question (Q-ICT-001) only has **4.90% coherence**
- **High confidence matches**: Only 0-5 per question (out of 204 requirements!)

**What this means:** The precomputed mappings are not accurate - they're just grabbing ALL requirements from ALL controls in the pillar.

### Issue 4: Massive Overlaps

**The Problem:**
- **11 different questions** all map to the same requirements (e.g., DORA-REQ-050 through DORA-REQ-059)
- **11 different questions** all map to the same controls (e.g., ISO-5.5, ISO-5.24, ISO-5.25, etc.)

**Impact:** When multiple questions are answered "no", the same controls get included multiple times, causing confusion.

---

## 🔍 Root Cause Analysis

### The Problem in `precomputed-mappings.ts`

Looking at the code (line 128):
```typescript
const controls = await Control.find({ pillar: question.pillar });
// This gets ALL controls for the pillar, not just relevant ones
```

**What's happening:**
1. For each question, the system gets **ALL controls** in that pillar
2. Then it gets **ALL requirements** from those controls
3. This results in questions mapping to 80-90% of all requirements/controls

**Why this is wrong:**
- A question like "Do you have an ICT risk management framework?" should map to maybe 5-10 specific requirements about risk management frameworks
- It should NOT map to ALL 204 requirements in the ICT_RISK_MANAGEMENT pillar

---

## 📊 Test Results Summary

| Metric | Value | Status |
|--------|-------|--------|
| Questions analyzed | 24 | ✅ |
| Average requirements per question | 81.67 | ❌ Too high |
| Max requirements (single question) | 204 | ❌ Way too high |
| Questions with >15 requirements | 21 | ❌ 88% of questions |
| Questions mapping to >10 controls | 16 | ❌ 67% of questions |
| Average coherence | 0-5% | ❌ Very low |
| Questions with 0% coherence | 10+ | ❌ Very poor |

---

## 💡 Recommendations

### Immediate Fix (Priority 1): Narrow Question Mappings

**Option A: Use NLP Similarity Threshold**
- Only include requirements with high/medium confidence (>0.6 similarity)
- This would reduce mappings from 204 to maybe 10-20 per question

**Option B: Manual Curation**
- Manually review and curate question-to-requirement mappings
- Use domain experts to identify which requirements truly relate to each question

**Option C: Hybrid Approach**
- Use NLP to suggest mappings
- But require manual validation/approval
- Set maximum limits (e.g., max 15 requirements per question)

### Long-term Fix (Priority 2): Improve Precomputation Logic

**Current logic:**
```typescript
// Gets ALL controls in pillar
const controls = await Control.find({ pillar: question.pillar });
```

**Better logic:**
```typescript
// Use NLP similarity to find relevant controls first
// Then get requirements only from those controls
// Apply similarity threshold (e.g., >0.6)
```

---

## 🎯 Next Steps

1. **Review the test results** - See `scripts/test-question-requirement-mapping.js` output
2. **Decide on fix approach** - NLP threshold, manual curation, or hybrid?
3. **Implement fix** - Update precomputation logic
4. **Re-run precomputation** - Generate new mappings
5. **Re-test** - Verify mappings are now reasonable (5-15 requirements per question)
6. **Test end-to-end** - Verify questionnaire → gap analysis flow works correctly

---

## 📝 Questions to Answer

1. **What's the target?** How many requirements should each question map to? (I suggest 5-15)
2. **NLP threshold?** What similarity score should we use? (I suggest >0.6 for high confidence)
3. **Manual review?** Do you want to manually review/curate mappings, or rely on NLP?
4. **Maximum limits?** Should we set hard limits? (e.g., max 15 requirements per question)

---

## 🔧 Files to Fix

1. **`lib/services/precomputed-mappings.ts`** - Fix the mapping logic (line 128)
2. **`lib/services/precomputed-mappings.ts`** - Add similarity threshold filtering
3. **Re-run precomputation** - Generate new QuestionMapping documents

---

## ✅ Success Criteria

After fixing, we should see:
- ✅ Average requirements per question: 5-15 (not 81!)
- ✅ Max requirements per question: <20 (not 204!)
- ✅ Average coherence: >50% (not 0-5%!)
- ✅ High confidence matches: >50% of mappings (not 0-5!)
- ✅ Questions mapping to >10 controls: <5 (not 16!)

---

## 🚀 Ready to Fix?

Once you decide on the approach (NLP threshold, manual curation, or hybrid), I can:
1. Update the precomputation logic
2. Add similarity threshold filtering
3. Re-run precomputation
4. Verify the fix with tests

Let me know which approach you prefer!
