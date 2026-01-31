# Matching Engine Test Suite Documentation

## Overview

Comprehensive test suite to ensure no regressions in the matching engine. Tests the complete flow from questions to gap analysis.

---

## Test Suites

### 1. Main Test Suite: `test-matching-engine-suite.js`

**Purpose**: Comprehensive regression testing of all matching engine components

**What it tests**:
- ✅ Precomputed mappings (Question → Requirement)
- ✅ Requirement-to-Control mapping (static)
- ✅ Questionnaire response calculation
- ✅ Gap analysis filtering
- ✅ ID format consistency
- ✅ End-to-end flow
- ✅ Edge cases

**Usage**:
```bash
npm run test:matching-suite
```

**Expected Output**:
- All tests should pass
- Shows statistics and validation results
- Reports any failures with details

---

### 2. Integration Test: `test-matching-integration.js`

**Purpose**: Tests the complete integration flow

**What it tests**:
- ✅ Simulates questionnaire submission
- ✅ Calculates requirements from "No" answers
- ✅ Calculates controls from requirements
- ✅ Simulates gap analysis filtering
- ✅ Verifies end-to-end flow works

**Usage**:
```bash
npm run test:matching-integration
```

**Expected Output**:
- Step-by-step flow validation
- Verifies each stage works correctly
- Confirms reasonable control counts

---

### 3. Flow Test: `test-matching-engine-flow.js`

**Purpose**: Tests the actual matching engine flow with real data

**What it tests**:
- ✅ Loads actual questionnaire responses
- ✅ Verifies ID format consistency
- ✅ Tests question-to-requirement mapping
- ✅ Tests requirement-to-control mapping
- ✅ Tests control-to-asset matching
- ✅ Tests gap analysis consistency

**Usage**:
```bash
npm run test:matching-flow
```

**Expected Output**:
- Detailed analysis of current state
- Identifies issues and warnings
- Shows statistics

---

### 4. Question Mapping Test: `test-question-requirement-mapping.js`

**Purpose**: Validates question-to-requirement mappings

**What it tests**:
- ✅ Question uniqueness
- ✅ Mapping breadth (requirements per question)
- ✅ Control mapping (controls per question)
- ✅ Overlapping mappings
- ✅ Coherence metrics

**Usage**:
```bash
npm run test:question-mapping
```

**Expected Output**:
- Hypothesis validation
- Mapping statistics
- Identifies overly broad mappings

---

### 5. Completeness Test: `test-matching-completeness.js`

**Purpose**: Ensures ALL questions and requirements are properly mapped

**What it tests**:
- ✅ Every question has a precomputed mapping
- ✅ Every question's requirements map to controls
- ✅ Every requirement maps to at least one control
- ✅ Every control maps to at least one requirement
- ✅ Cross-reference validation (Question → Requirement → Control chains)
- ✅ Pillar coverage analysis

**Usage**:
```bash
npm run test:matching-completeness
```

**Expected Output**:
- Complete mapping coverage report
- Identifies unmapped questions/requirements
- Shows pillar-specific statistics
- Validates all chains are complete

---

## Running All Tests

### Quick Test (Recommended)
```bash
# Run the main test suite
npm run test:matching-suite
```

### Full Test Suite
```bash
# Run all matching engine tests
npm run test:matching-suite
npm run test:matching-integration
npm run test:matching-flow
npm run test:question-mapping
npm run test:matching-completeness
```

### Before Committing
```bash
# Run all tests to ensure no regressions
npm run test:matching-suite && npm run test:matching-integration && npm run test:matching-completeness
```

---

## Test Coverage

### ✅ Covered Areas

1. **Precomputed Mappings**
   - All questions have mappings
   - Reasonable requirement counts (0-20 per question)
   - Coherence metrics present
   - No low-confidence matches

2. **Requirement-to-Control Mapping**
   - Requirements map to controls
   - Controls have requirement mappings
   - Static mapping is correct

3. **Questionnaire Response**
   - All "Yes" → 0 controls
   - "No" answers → Controls calculated
   - Control reasoning present
   - ID format consistency

4. **Gap Analysis**
   - Uses questionnaire response controls
   - Handles empty controls (100% compliance)
   - Filters correctly by pillar
   - ID matching works

5. **End-to-End Flow**
   - Question → Requirement → Control flow
   - Complete integration works
   - Reasonable control counts

6. **Edge Cases**
   - Questions with 0 requirements
   - Missing mappings
   - ID format mismatches

---

## Expected Test Results

### ✅ Passing Criteria

1. **Precomputed Mappings**:
   - Average requirements per question: 0-25
   - Max requirements per question: ≤ 20
   - All mappings have coherence metrics

2. **Questionnaire Response**:
   - All "Yes" → 0 controls ✅
   - "No" answers → Reasonable controls (1-50 per "No")
   - ID format consistency ≥ 80%

3. **Gap Analysis**:
   - Uses questionnaire response controls
   - Empty controls → 100% compliance
   - Control match rate ≥ 80%

4. **End-to-End**:
   - Complete flow works
   - Reasonable control counts
   - No errors or crashes

---

## Interpreting Results

### ✅ All Tests Pass
- No regressions detected
- Matching engine working correctly
- Safe to proceed

### ⚠️ Some Tests Fail
- Review failure messages
- Check if it's a known issue or regression
- Fix issues before proceeding

### ❌ Many Tests Fail
- Likely regression introduced
- Review recent changes
- Fix before committing

---

## Continuous Testing

### Recommended Workflow

1. **Before Making Changes**:
   ```bash
   npm run test:matching-suite
   ```
   - Establish baseline

2. **After Making Changes**:
   ```bash
   npm run test:matching-suite
   npm run test:matching-integration
   ```
   - Verify no regressions

3. **Before Committing**:
   ```bash
   npm run test:matching-suite && npm run test:matching-integration
   ```
   - Ensure all tests pass

4. **After Precomputation**:
   ```bash
   npm run test:question-mapping
   ```
   - Verify mappings are correct

---

## Test Maintenance

### When to Update Tests

1. **New Features**: Add tests for new functionality
2. **Bug Fixes**: Add regression tests for fixed bugs
3. **Refactoring**: Update tests if logic changes
4. **Threshold Changes**: Update expected ranges if thresholds change

### Adding New Tests

1. Add test to appropriate test suite
2. Use `runTest()` helper for consistency
3. Add clear assertions with helpful messages
4. Update this documentation

---

## Troubleshooting

### Tests Fail After Changes

1. **Check if it's expected**: Did you change thresholds or logic?
2. **Review failure message**: What exactly failed?
3. **Check data**: Is test data correct?
4. **Verify logic**: Is the new logic correct?

### Tests Pass But System Doesn't Work

1. **Check test coverage**: Are all scenarios tested?
2. **Add more tests**: Cover the failing scenario
3. **Check edge cases**: Test boundary conditions

### Tests Are Too Slow

1. **Optimize test data**: Use smaller datasets
2. **Parallel tests**: Run independent tests in parallel
3. **Cache results**: Cache expensive operations

---

## Test Data Requirements

Tests use actual data from:
- `data/local-db/Question.json`
- `data/local-db/DORARequirement.json`
- `data/local-db/Control.json`
- `data/local-db/QuestionMapping.json`
- `data/local-db/QuestionnaireResponse.json`
- `data/local-db/GapAnalysis.json`

Ensure these files exist and have test data before running tests.

---

## Summary

The test suite ensures:
- ✅ No regressions in matching logic
- ✅ Correct flow: Questions → Requirements → Controls
- ✅ Gap analysis works correctly
- ✅ ID format consistency
- ✅ Edge cases handled

**Run tests regularly to catch regressions early!**
