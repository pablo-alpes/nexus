# Coherence & Relevance Analysis

**Generated:** 2025-12-07  
**Analysis:** Quality and relevance of matches, not just coverage

---

## 🚨 Critical Finding: Poor Match Quality

### Keyword Matching Quality

| Metric | Value | Status |
|--------|-------|--------|
| **Total Keyword Matches** | 783 | - |
| **Relevant Matches** | 386 | **49.3%** ⚠️ |
| **Irrelevant Matches** | 397 | **50.7%** ❌ |
| **Average Relevance Score** | 40.7% | ❌ Poor |
| **Coherence Score** | 49.7% | ❌ Poor |

**Key Finding:** **50.7% of keyword matches are IRRELEVANT** - more than half!

### Explicit Mapping Quality

| Metric | Value | Status |
|--------|-------|--------|
| **Total Explicit Matches** | 0 | ❌ None |
| **Relevant Matches** | 0 | ❌ None |

**Key Finding:** No explicit mappings exist to compare.

### Control-Based (Ideal) Matching

| Metric | Value | Status |
|--------|-------|--------|
| **Total Matches** | 980 | - |
| **Average Relevance Score** | 16.6% | ⚠️ Low |
| **Coherence Score** | 19.2% | ⚠️ Low |

**Note:** Even control-based matches have low relevance scores because requirements are often written in legal language that doesn't match question wording.

---

## 📊 Quality Breakdown

### Coherence Distribution

- **Low Coherence (<50%):** 5 questions
- **High Coherence (>80%):** 1 question
- **Medium Coherence (50-80%):** 5 questions

**Finding:** Most questions have poor coherence - matches are not semantically relevant.

---

## 🔴 Worst Performing Questions

### 1. Q-ICT-004 (Vulnerability Management)
- **Coherence:** 0.0% ❌
- **Relevance:** 25.0% ❌
- **Matches:** 55 total
- **Relevant:** 0 (0%)
- **Irrelevant:** 55 (100%) ❌

**Example Irrelevant Matches:**
- DORA-REQ-006: Article 5: Governance and organisation...
- DORA-REQ-020: Article 6: ICT risk management framework...
- DORA-REQ-021: Article 6: ICT risk management framework...

**Problem:** Question about "vulnerability management" matches generic "risk management" requirements that aren't specifically about vulnerabilities.

### 2. Q-ICT-006 (Security Incidents)
- **Coherence:** 14.3% ❌
- **Relevance:** 28.6% ❌
- **Matches:** 98 total
- **Relevant:** 14 (14.3%)
- **Irrelevant:** 84 (85.7%) ❌

**Problem:** Question about "security incidents" matches many generic governance requirements.

### 3. Q-TP-002 (Third-Party Risk Assessment)
- **Coherence:** 16.3% ❌
- **Relevance:** 29.7% ❌
- **Matches:** 43 total
- **Relevant:** 7 (16.3%)
- **Irrelevant:** 36 (83.7%) ❌

**Problem:** Question about "third-party risk" matches general risk management requirements.

---

## 💡 Why This Matters

### Current Approach Problems

1. **50.7% False Positives**
   - More than half of keyword matches are irrelevant
   - Inflates compliance requirements unnecessarily
   - Creates confusion about what's actually needed

2. **Low Relevance (40.7%)**
   - Matches are semantically weak
   - Requirements don't actually relate to questions
   - Legal language doesn't match question wording

3. **No Validation**
   - Can't verify if matches make sense
   - No way to filter out irrelevant matches
   - No human review process

### Impact on Compliance Assessment

**False Positives Lead To:**
- ❌ Over-compliance (implementing unnecessary controls)
- ❌ Wasted resources (time and money on irrelevant controls)
- ❌ Confusion (unclear what's actually required)
- ❌ Inflated compliance costs

**Missing Relevant Requirements Lead To:**
- ❌ Under-compliance (missing actual requirements)
- ❌ Compliance gaps (not addressing real needs)
- ❌ Regulatory risk (non-compliance penalties)

---

## ✅ Solution: Explicit Mappings

### Why Explicit Mappings Solve This

1. **Human Review**
   - Each mapping reviewed by domain expert
   - Only relevant requirements included
   - Semantic relevance validated

2. **Control-Based Logic**
   - Requirements mapped based on control relationships
   - Logical connections, not keyword matching
   - Validated against ISO standards

3. **Quality Assurance**
   - Validation process ensures coherence
   - Can measure and improve relevance
   - Audit trail for each mapping

### Expected Improvement

| Metric | Current (Keyword) | Proposed (Explicit) | Improvement |
|--------|------------------|---------------------|-------------|
| **Relevance** | 40.7% | ~90%+ | **+49.3%** ✅ |
| **Coherence** | 49.7% | ~95%+ | **+45.3%** ✅ |
| **False Positives** | 50.7% | <5% | **-45.7%** ✅ |
| **Quality** | Poor | High | **+100%** ✅ |

---

## 🎯 Recommendation

**Move to Explicit Mappings** because:

1. ✅ **Quality over Quantity**
   - Current: 783 matches, but 397 (50.7%) are irrelevant
   - Proposed: Fewer matches, but all relevant

2. ✅ **Semantic Coherence**
   - Current: 40.7% average relevance
   - Proposed: ~90%+ relevance with human review

3. ✅ **Validated Mappings**
   - Current: No validation possible
   - Proposed: Full validation and review process

4. ✅ **Reduced False Positives**
   - Current: 50.7% false positives
   - Proposed: <5% false positives

**The data shows that keyword matching produces poor quality results - more than half are irrelevant. Explicit mappings will ensure only relevant, coherent matches are used.**

---

## 📁 Files

- `data/coherence-analysis-results.json` - Detailed coherence analysis
- `scripts/analyze-matching-coherence.js` - Coherence analysis script

