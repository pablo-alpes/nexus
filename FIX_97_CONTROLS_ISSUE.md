# Fix: Gap Analysis Showing 97 Controls Instead of Filtered Set

## Problem

The gap analysis is showing **97 controls** for ICT Risk Management instead of a filtered set (10-20 controls). This happens because:

1. ❌ The questionnaire response has `applicableControls: []` (empty)
2. ❌ When `applicableControls` is empty, gap analysis falls back to showing **ALL controls** for the pillar
3. ❌ This is the old behavior before the improved mappings

## Root Cause

The questionnaire response was created **before** the improved mappings were applied, so:
- It has 0 applicable controls calculated
- OR all answers were "yes" (no gaps, so no controls needed)
- OR the requirement-to-control mapping failed

## Solution

### Option 1: Resubmit Questionnaire (Recommended)

1. **Go to the questionnaire in the UI**
2. **Make sure you have some "No" answers** (these create gaps that need controls)
   - If all answers are "Yes", you'll get 0 controls (which is correct - no gaps!)
   - You need at least a few "No" answers to generate controls
3. **Resubmit the questionnaire**
   - This will recalculate `applicableControls` using the **NEW improved mappings**
   - The new mappings should result in 10-20 controls per question (not 200+)
4. **Regenerate gap analysis**
   - It will now use the updated questionnaire response
   - You should see 10-20 controls instead of 97

### Option 2: Delete and Recreate Questionnaire Response

If you can't resubmit through the UI:

1. **Delete the old questionnaire response**
   ```bash
   # Or use the UI to delete it
   ```

2. **Submit a new questionnaire**
   - It will automatically use the new improved mappings
   - Make sure to have some "No" answers

3. **Regenerate gap analysis**

### Option 3: Check Your Answers

If you're seeing 0 controls, check:

1. **Do you have any "No" answers?**
   - "No" answers = gaps = controls needed
   - "Yes" answers = you have it = no controls needed
   - If ALL answers are "Yes", 0 controls is correct!

2. **If you want to see controls, answer some questions as "No"**
   - This will create gaps
   - The system will calculate controls for those gaps
   - Using the new improved mappings (10-20 per question)

## Expected Results After Fix

After resubmitting with the new mappings:

### Before (Old Mappings):
- ❌ 97 controls for ICT Risk Management
- ❌ All controls shown (no filtering)

### After (New Mappings):
- ✅ 10-20 controls for ICT Risk Management
- ✅ Only relevant controls shown
- ✅ Based on "No" answers only

## Verification

After resubmitting, check:

```bash
# Check questionnaire response
node scripts/check-questionnaire-response.js
```

You should see:
- ✅ `applicableControls` has 10-50 controls (not 0, not 200+)
- ✅ Controls are reasonable for the number of "No" answers

## Why This Happened

1. ✅ We improved the question-to-requirement mappings (reduced from 200+ to 20 per question)
2. ✅ We reran precomputation with the new logic
3. ❌ But the **questionnaire response** still has the old data (0 controls)
4. ❌ Gap analysis sees empty `applicableControls` → shows all controls

**The fix**: Resubmit the questionnaire to recalculate with new mappings!

## Quick Test

To verify the new mappings work:

1. Submit a questionnaire with 2-3 "No" answers for ICT_RISK_MANAGEMENT
2. Check the response - should have 20-40 controls (not 0, not 200+)
3. Generate gap analysis - should show 20-40 controls (not 97)

---

**TL;DR**: Resubmit your questionnaire through the UI. Make sure you have some "No" answers. The new mappings will automatically be used.
