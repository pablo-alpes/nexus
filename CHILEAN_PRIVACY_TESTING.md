# Chilean Privacy Testing Strategy

This document describes the testing strategy for the Chilean Privacy Law (Ley 21.719) matching engine.

## Test Files

### 1. `test-chilean-privacy-completeness.js`
**Purpose**: Verify ALL questions and requirements are properly mapped

**Tests**:
- Every Chilean Privacy question has a precomputed mapping
- Every question's requirements map to controls
- Every requirement maps to at least one control
- Every control maps to at least one requirement
- Pillar coverage analysis

**Usage**:
```bash
npm run test:chilean-privacy-completeness
```

### 2. `test-chilean-privacy-engine-flow.js`
**Purpose**: Test the complete flow from questionnaire to gap analysis

**Tests**:
- Questionnaire response analysis
- Question → Requirement mapping
- Requirement → Control mapping
- Control → Asset mapping
- Pillar coverage

**Usage**:
```bash
npm run test:chilean-privacy-flow
```

### 3. `test-chilean-privacy-suite.js`
**Purpose**: Comprehensive test suite with assertions

**Tests**:
- Data availability
- Question structure validation
- Requirement structure validation
- Question mapping coverage
- Requirement to control mapping
- Pillar coverage
- ISO 27701 controls structure

**Usage**:
```bash
npm run test:chilean-privacy-suite
```

## Test Coverage

### Questions
- ✅ All questions have `questionId`
- ✅ All questions have valid `pillar` (one of 8 Chilean Privacy pillars)
- ✅ All questions have `text`
- ✅ Questions are properly mapped to requirements

### Requirements
- ✅ All requirements have `requirementId`
- ✅ All requirements have valid `pillar`
- ✅ All requirements have `title` and `description`
- ✅ Requirements map to controls (database or ISO 27701)

### Controls
- ✅ Controls have valid `pillar`
- ✅ Controls map to requirements
- ✅ ISO 27701 controls are properly structured

### Mappings
- ✅ Question mappings exist for Chilean Privacy questions
- ✅ Mappings contain valid requirement IDs
- ✅ Requirements from mappings exist in database

### Pillars
- ✅ All 8 pillars have questions
- ✅ All 8 pillars have requirements
- ✅ All 8 pillars have controls (database or ISO 27701)

## Running All Tests

```bash
# Run all Chilean Privacy tests
npm run test:chilean-privacy-completeness
npm run test:chilean-privacy-flow
npm run test:chilean-privacy-suite
```

## Expected Results

### Completeness Test
- ✅ At least 80% of questions have mappings
- ✅ At least 50% of requirements map to controls
- ✅ All pillars have coverage

### Flow Test
- ✅ Questionnaire response can be processed
- ✅ Questions map to requirements correctly
- ✅ Requirements map to controls correctly
- ✅ Controls apply to assets correctly

### Suite Test
- ✅ All structure validations pass
- ✅ Mapping coverage meets thresholds
- ✅ All pillars have data

## Troubleshooting

### No Questions Found
```bash
# Create Chilean Privacy questionnaire
npm run setup:chilean-privacy
```

### No Requirements Found
```bash
# Import Chilean Privacy requirements
node scripts/import-chilean-privacy-requirements.js
```

### No Mappings Found
```bash
# Precompute mappings for Chilean Privacy
npm run precompute:mappings:privacy
```

### No Controls Found
- Check that controls exist in database for Chilean Privacy pillars
- Verify ISO 27701 controls JSON file exists
- Create controls from requirements if needed

## Comparison with DORA Tests

The Chilean Privacy tests follow the same pattern as DORA tests:

| DORA Test | Chilean Privacy Test |
|-----------|---------------------|
| `test-matching-completeness.js` | `test-chilean-privacy-completeness.js` |
| `test-matching-engine-flow.js` | `test-chilean-privacy-engine-flow.js` |
| `test-matching-engine-suite.js` | `test-chilean-privacy-suite.js` |

**Key Differences**:
- Uses `Requirement` model instead of `DORARequirement`
- Filters by `regulationType: 'CHILEAN_PRIVACY'`
- Uses ISO 27701 controls instead of ISO 27002
- Tests 8 pillars instead of 5
- Question IDs start with `Q-PRIV-` instead of `Q-`

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test Chilean Privacy Matching Engine
  run: |
    npm run test:chilean-privacy-completeness
    npm run test:chilean-privacy-flow
    npm run test:chilean-privacy-suite
```

## Next Steps

1. Run tests after setting up Chilean Privacy data
2. Fix any issues identified
3. Ensure all tests pass before deploying
4. Add more specific tests as needed
5. Monitor test results over time
